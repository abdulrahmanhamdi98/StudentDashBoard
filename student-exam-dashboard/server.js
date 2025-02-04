const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;
const session = require('express-session');

app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

const db = new sqlite3.Database('./students.db', (err) => {
    if (!err) {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, 
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY, 
            studentId TEXT NOT NULL,
            studentName TEXT NOT NULL,
            lessonName TEXT NOT NULL, 
            quizTotal REAL NOT NULL,
            assignment REAL NOT NULL,
            finalExam REAL NOT NULL,
            totalGrade REAL NOT NULL
        )`);
    }    
});

let currentUserRole;

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/student_dashboard', (req, res) => {
    if (req.session.userRole === 'student') {
        res.sendFile(path.join(__dirname, 'student_dashboard.html'));
    } else {
        res.status(403).send("Access denied. Please log in as a student.");
    }
});

app.get('/teacher_dashboard', (req, res) => {
    if (req.session.userRole === 'teacher') {
        res.sendFile(path.join(__dirname, 'teacher_dashboard.html'));
    } else {
        res.status(403).send("Access denied. Please log in as a teacher.");
    }
});

app.post('/login', (req, res) => {
    const { username, password, role } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).send(err);
        if (row && row.role === role) {
            req.session.userRole = row.role;
            req.session.userId = row.id;
            res.json({ id: row.id, role: row.role });
        } else {
            res.status(401).send("Invalid username, password, or role");
        }
    });
});

app.delete('/students/:id', (req, res) => {
    const studentId = req.params.id;
    db.run('DELETE FROM students WHERE studentId = ?', [studentId], function(err) {
        if (err) return res.status(500).send(err);
        if (this.changes === 0) return res.status(404).send("Student not found");
        res.send("Student deleted successfully.");
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Could not log out.");
        }
        res.redirect('/login');
    });
});

app.post('/students', (req, res) => {
    const student = req.body;
    const sql = 'INSERT INTO students (studentId, studentName, lessonName, quizTotal, assignment, finalExam, totalGrade) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [student.studentId, student.studentName, student.lessonName, student.quizTotal, student.assignment, student.finalExam, student.totalGrade], function(err) {
        if (err) return res.status(500).send(err);
        res.json({ id: this.lastID, ...student });
    });
});

app.get('/students', (req, res) => {
    if (currentUserRole === 'teacher') {
        db.all('SELECT * FROM students', [], (err, rows) => {
            if (err) return res.status(500).send(err);
            res.json(rows);
        });
    } else {
        res.status(403).send("Access denied");
    }
});

app.get('/students/:id', (req, res) => {
    const studentId = req.params.id;
    db.get('SELECT * FROM students WHERE studentId = ?', [studentId], (err, row) => {
        if (err) return res.status(500).send(err);
        if (row) {
            res.json(row);
        } else {
            res.status(404).send("Student not found");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Access the login page at http://localhost:${PORT}/login`);
});
