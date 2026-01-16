require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const heartbeatRoutes = require('./routes/hearbeat');
const healthCheckService = require('./services/healthCheck');
const path = require('path');

// Middleware setup
const app = express();
app.use(cors({
    origin: '*'
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// router
app.use("/api", heartbeatRoutes);

// connect to database
mongoose.connect(process.env.MONGODB_URI).then((data) => {
    console.log(`Connected to MongoDB at ${data.connection.host}:${data.connection.port}`);
    // Start health check loop
    healthCheckService.start();
})
    .catch((err) => {
        console.error(`Database connection error: ${err}`);

    });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!process.env.PORT) {
    throw new Error("No PORT set as variable.")
} else if (parseInt(process.env.PORT) == NaN) {
    throw new Error("PORT Should be an Int.")
} else {
    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
}

