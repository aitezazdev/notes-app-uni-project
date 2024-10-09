const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const app = express();

// Database setup
const db = new sqlite3.Database("./notes.db", (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Connected to the Notes database.");
});

// Create table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY,
        date TEXT,
        content TEXT
    )`);
});

// Middleware setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    db.all(`SELECT * FROM notes ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error retrieving notes");
        }
        res.render("index", { notes: rows });
    });
});

// Search route
app.get("/search", (req, res) => {
    const query = req.query.query;
    db.all(`SELECT * FROM notes WHERE date LIKE ? ORDER BY id DESC`, [`%${query}%`], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error searching notes");
        }
        res.render("search", { notes: rows, query: query });
    });
});

// Create route
app.get("/create", (req, res) => {
    res.render("create");
});

// POST route for creating a new Note
app.post("/create", (req, res) => {
    const { date, content } = req.body;

    db.get("SELECT MAX(id) as maxId FROM notes", [], (err, row) => {
        if (err) {
            return console.log(err.message);
        }
        
        const nextId = (row.maxId || 0) + 1;

        db.run(
            `INSERT INTO notes (id, date, content) VALUES (?, ?, ?)`,
            [nextId, date, content],
            function (err) {
                if (err) {
                    return console.log(err.message);
                }
                res.redirect("/");
            }
        );
    });
});

// View a specific Note
app.get("/note/:id", (req, res) => {
    const id = parseInt(req.params.id);
    db.get(`SELECT * FROM notes WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).send("Note not found");
        }
        res.render("note", { note: row });
    });
});

// Edit a specific Note
app.get("/edit/:id", (req, res) => {
    const id = parseInt(req.params.id);
    db.get(`SELECT * FROM notes WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).send("Note not found");
        }
        res.render("edit", { note: row });
    });
});

// Update a specific Note
app.post("/update/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { date, content } = req.body;
    db.run(
        `UPDATE notes SET date = ?, content = ? WHERE id = ?`,
        [date, content, id],
        function (err) {
            if (err) {
                return console.log(err.message);
            }
            res.redirect("/");
        }
    );
});

// Delete a specific Note
app.get("/delete/:id", (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM notes WHERE id = ?`, [id], function (err) {
        if (err) {
            return console.log(err.message);
        }
        res.redirect("/");
    });
});

// Dashboard route
app.get("/dashboard", (req, res) => {
    db.all(`SELECT strftime('%Y-%m', date) AS month, COUNT(*) AS count FROM notes GROUP BY month ORDER BY month`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Error retrieving dashboard data");
        }

        const monthData = rows.map(row => ({
            month: row.month,
            count: row.count
        }));

        db.get(`SELECT COUNT(*) AS totalNotes,
            MIN(LENGTH(content)) AS shortestNote,
            MAX(LENGTH(content)) AS longestNote,
            MIN(CASE WHEN LENGTH(content) = (SELECT MIN(LENGTH(content)) FROM notes) THEN id END) AS shortestId,
            MAX(CASE WHEN LENGTH(content) = (SELECT MAX(LENGTH(content)) FROM notes) THEN id END) AS longestId
            FROM notes`, [], (err, stats) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Error retrieving stats");
            }

            // Validate that shortestId and longestId exist
            if (stats.shortestId === null) stats.shortestId = -1;
            if (stats.longestId === null) stats.longestId = -1;

            // Fetching the shortest and longest Notes' details
            db.all(`SELECT * FROM notes WHERE id IN (?, ?)`, [stats.shortestId, stats.longestId], (err, details) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send("Error retrieving Notes");
                }

                // Building a map for easier access
                const noteDetails = {};
                details.forEach(note => {
                    noteDetails[note.id] = note;
                });

                res.render("dashboard", {
                    monthDataJSON: JSON.stringify(monthData),
                    stats: { ...stats, noteDetails }
                });
            });
        });
    });
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});