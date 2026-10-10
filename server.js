const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FARE = 15; // Rs. per EV use - fixed
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PLACES = ['Hostel', 'Canteen', 'Hospital', 'College', 'School',
  'Small Manufacturing Unit', 'Big Manufacturing Unit', 'Workshop',
  'Food Spot', 'Prayer Hall', 'Library'];
const SEMS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

// ---------- tiny JSON "database" ----------
function load() {
  if (!fs.existsSync(DB_FILE)) return { students: [], trips: [], payments: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function save(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function hash(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString('hex'); }

// ---------- sessions ----------
const sessions = new Map();
function auth(role) {
  return (req, res, next) => {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    const s = sessions.get(t);
    if (!s || (role && s.role !== role)) return res.status(401).json({ error: 'Not authorised' });
    req.session = s; next();
  };
}

// ---------- helpers ----------
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const isMonth = m => /^\d{4}-\d{2}$/.test(m || '');
function monthEnd(m) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 0).getDate();
  return `${m}-${String(d).padStart(2, '0')}`;
}
function summary(db, student, month) {
  const all = db.trips.filter(t => t.studentId === student.id);
  const monthTrips = all.filter(t => t.date.startsWith(month));
  const monthUnpaid = monthTrips.filter(t => !t.paid);
  const prevUnpaid = all.filter(t => t.date < month + '-01' && !t.paid);
  const due = (monthUnpaid.length + prevUnpaid.length) * FARE;
  let status = 'No usage';
  if (monthTrips.length || prevUnpaid.length) status = due === 0 ? 'Paid' : 'Pending';
  return {
    totalUses: all.length,
    monthCount: monthTrips.length,
    monthAmount: monthTrips.length * FARE,
    prevCount: prevUnpaid.length,
    prevAmount: prevUnpaid.length * FARE,
    due, status,
    trips: monthTrips.sort((a, b) => a.date.localeCompare(b.date))
  };
}
function dueUpTo(db, student, upto) {
  const payments = db.payments.filter(p => p.studentId === student.id);
  const lastPaid = payments.length ? payments.map(p => p.upto).sort().pop() : null;
  const trips = db.trips.filter(t => t.studentId === student.id && !t.paid && t.date <= upto)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { lastPaid, from: trips.length ? trips[0].date : null, to: upto,
    count: trips.length, amount: trips.length * FARE, trips };
}
const pub = s => ({ id: s.id, name: s.name, regNo: s.regNo, department: s.department, semester: s.semester });

// ---------- public ----------
app.get('/api/config', (req, res) => res.json({ places: PLACES, sems: SEMS, fare: FARE }));

app.post('/api/register', (req, res) => {
  const { name, regNo, department, semester, password } = req.body;
  if (!name || !regNo || !department || !SEMS.includes(semester) || !password || password.length < 4)
    return res.status(400).json({ error: 'Fill all fields (password min 4 chars)' });
  const db = load();
  if (db.students.some(s => s.regNo.toLowerCase() === regNo.toLowerCase()))
    return res.status(400).json({ error: 'Register number already exists' });
  const salt = crypto.randomBytes(8).toString('hex');
  db.students.push({ id: crypto.randomUUID(), name: name.trim(), regNo: regNo.trim(),
    department: department.trim(), semester, salt, pass: hash(password, salt) });
  save(db);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const { role, username, password } = req.body;
  let session;
  if (role === 'admin') {
    if (username !== ADMIN_USER || password !== ADMIN_PASS)
      return res.status(401).json({ error: 'Wrong admin credentials' });
    session = { role: 'admin' };
  } else {
    const s = load().students.find(x => x.regNo.toLowerCase() === (username || '').toLowerCase());
    if (!s || hash(password || '', s.salt) !== s.pass)
      return res.status(401).json({ error: 'Wrong register number or password' });
    session = { role: 'student', id: s.id };
  }
  const token = crypto.randomUUID();
  sessions.set(token, session);
  res.json({ token, role: session.role });
});

// ---------- student ----------
app.get('/api/me', auth('student'), (req, res) => {
  const s = load().students.find(x => x.id === req.session.id);
  res.json(pub(s));
});

app.post('/api/trips', auth('student'), (req, res) => {
  const { date, from, to } = req.body;
  if (!isDate(date) || !PLACES.includes(from) || !PLACES.includes(to))
    return res.status(400).json({ error: 'Choose a valid date, from and to' });
  if (from === to) return res.status(400).json({ error: 'From and To cannot be the same' });
  const db = load();
  db.trips.push({ id: crypto.randomUUID(), studentId: req.session.id, date, from, to, paid: false });
  save(db);
  res.json({ ok: true });
});

app.get('/api/summary', auth('student'), (req, res) => {
  const db = load();
  const s = db.students.find(x => x.id === req.session.id);
  const month = isMonth(req.query.month) ? req.query.month : new Date().toISOString().slice(0, 7);
  res.json(summary(db, s, month));
});

app.get('/api/due', auth('student'), (req, res) => {
  if (!isDate(req.query.upto)) return res.status(400).json({ error: 'Pick a date' });
  const db = load();
  const s = db.students.find(x => x.id === req.session.id);
  const d = dueUpTo(db, s, req.query.upto);
  delete d.trips;
  res.json(d);
});

// ---------- admin ----------
app.get('/api/admin/students', auth('admin'), (req, res) => {
  const db = load();
  const month = isMonth(req.query.month) ? req.query.month : new Date().toISOString().slice(0, 7);
  res.json(db.students.map(s => {
    const m = summary(db, s, month); delete m.trips;
    return { ...pub(s), ...m };
  }));
});

app.post('/api/admin/pay', auth('admin'), (req, res) => {
  const { studentId, upto } = req.body;
  if (!isDate(upto)) return res.status(400).json({ error: 'Invalid date' });
  const db = load();
  const s = db.students.find(x => x.id === studentId);
  if (!s) return res.status(404).json({ error: 'Student not found' });
  const d = dueUpTo(db, s, upto);
  db.trips.forEach(t => { if (t.studentId === studentId && !t.paid && t.date <= upto) t.paid = true; });
  db.payments.push({ id: crypto.randomUUID(), studentId, upto, count: d.count,
    amount: d.amount, paidOn: new Date().toISOString().slice(0, 10) });
  save(db);
  res.json({ ok: true, count: d.count, amount: d.amount });
});

app.post('/api/admin/unpay', auth('admin'), (req, res) => {
  const { studentId, month } = req.body;
  if (!isMonth(month)) return res.status(400).json({ error: 'Invalid month' });
  const db = load();
  db.trips.forEach(t => { if (t.studentId === studentId && t.date.startsWith(month)) t.paid = false; });
  db.payments = db.payments.filter(p => !(p.studentId === studentId && p.upto.startsWith(month)));
  save(db);
  res.json({ ok: true });
});

// ---------- PDF receipt (student: own, admin: any via studentId) ----------
app.get('/api/receipt', auth(), (req, res) => {
  const db = load();
  const sid = req.session.role === 'admin' ? req.query.studentId : req.session.id;
  const s = db.students.find(x => x.id === sid);
  if (!s) return res.status(404).json({ error: 'Student not found' });

  let title, rows, lines = [], total;
  if (isDate(req.query.upto)) {
    const d = dueUpTo(db, s, req.query.upto);
    title = `Amount payable up to ${req.query.upto}`;
    rows = d.trips;
    lines.push(`Last paid up to: ${d.lastPaid || 'never'}`);
    lines.push(`Period: ${d.from || '-'} to ${d.to}`);
    total = d.amount;
  } else {
    const month = isMonth(req.query.month) ? req.query.month : new Date().toISOString().slice(0, 7);
    const m = summary(db, s, month);
    title = `Monthly bill - ${month}`;
    rows = m.trips;
    lines.push(`Trips this month: ${m.monthCount}  (Rs.${m.monthAmount})`);
    lines.push(`Pending from earlier months: ${m.prevCount} trips (Rs.${m.prevAmount})`);
    lines.push(`Status: ${m.status}`);
    total = m.due;
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${s.regNo}.pdf`);
  doc.pipe(res);
  doc.fontSize(20).text('Campus EV Fee Receipt', { align: 'center' }).moveDown();
  doc.fontSize(12).text(`Name: ${s.name}`).text(`Reg No: ${s.regNo}`)
    .text(`Department: ${s.department}   Semester: ${s.semester}`)
    .text(`Generated on: ${new Date().toISOString().slice(0, 10)}`).moveDown();
  doc.fontSize(14).text(title).moveDown(0.5).fontSize(11);
  lines.forEach(l => doc.text(l));
  doc.moveDown().text(`Rate: Rs.${FARE} per use`).moveDown();
  rows.forEach((t, i) =>
    doc.text(`${i + 1}. ${t.date}   ${t.from} -> ${t.to}   [${t.paid ? 'Paid' : 'Pending'}]`));
  doc.moveDown().fontSize(15).text(`Total payable: Rs.${total}`);
  doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
