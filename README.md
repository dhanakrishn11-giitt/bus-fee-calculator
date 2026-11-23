# 🚌 Campus EV Fee Calculator

A web-based application designed to simplify campus electric vehicle (EV) transportation fee management.

The application allows students to record their daily EV usage, track their monthly transportation expenses, and view pending payments. It also provides an admin dashboard for managing student records, monitoring payments, and generating PDF receipts.

**🌐 Live Demo:** [Campus EV Fee Calculator](https://bus-fee-calculator-1.onrender.com/)

**💻 GitHub Repository:** [View Source Code](https://github.com/dhanakrishn11-giitt/bus-fee-calculator)

---

## 📌 Project Overview

The Campus EV Fee Calculator was developed as a B.Tech Computer Science Engineering team project.

The system is designed to make campus transportation fee management more organised by replacing manual trip tracking and fee calculations with a web-based solution.

Students can record their EV trips and view their payable amounts, while administrators can monitor student usage and manage payment records.

## ✨ Key Features

### 👨‍🎓 Student Features
- Student registration and login.
- Student profile management.
- Record EV usage with date, starting point and destination.
- View daily trip history.
- View monthly usage and fee summaries.
- Check pending fees from previous months.
- Calculate payable fees up to a selected date.
- Download PDF bills and receipts.

### 🏢 Admin Features
- Separate admin login.
- View registered student details.
- Monitor student EV usage.
- View monthly fee details.
- Track paid and pending payments.
- Update payment status.
- Generate student fee receipts.

## 💰 Fee Calculation

The application follows a fixed fee structure:

**Cost per EV trip = ₹15**

Formula:

`Total Fee = Number of EV Trips × ₹15`

Example:

| Description | Amount |
|---|---:|
| Number of trips | 250 |
| Cost per trip | ₹15 |
| Total payable | ₹3,750 |

The application also supports calculating outstanding fees up to a selected date.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML | Website structure |
| CSS | Styling and layout |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Server and API handling |
| PDFKit | PDF receipt generation |
| Git & GitHub | Version control and collaboration |
| Render | Application deployment |


## ⚙️ Installation and Setup

Follow these steps to run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your computer.
- Git installed.
- A code editor such as Visual Studio Code.

### Step 1: Clone the Repository

```bash
git clone https://github.com/dhanakrishn11-giitt/bus-fee-calculator.git
```

### Step 2: Open the Project Folder

```bash
cd bus-fee-calculator
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Application

```bash
npm start
```

### Step 5: Open in Browser

Visit:

```text
http://localhost:3000
```

The application should now be running locally.


## 🎯 Project Objective

The main objective of this project is to simplify campus EV transportation fee management through a centralised web application, helping students and administrative staff track vehicle usage, calculate fees and manage payment records efficiently.

## 🚀 Future Improvements

- Integration of a permanent database.
- Online payment gateway integration.
- Improved authentication and session management.
- Enhanced reporting and analytics.
- Better mobile responsiveness.

## 📄This project was developed for academic and educational purposes.

---

Developed as a B.Tech Computer Science Engineering project.
