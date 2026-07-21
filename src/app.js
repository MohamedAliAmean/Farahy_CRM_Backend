const express = require("express");
const cors = require("cors");
const clientRoute = require("./routes/clientRoute");
const supplierRoute = require("./routes/supplierRoute");
const eventRoute = require("./routes/eventRoute");
const versionRoute = require("./routes/versionRoute");
const logsRoute = require("./routes/logsRoute");
const employeeRoute = require("./routes/employeeRoute");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/clients", clientRoute);
app.use("/api/v1/suppliers", supplierRoute);
app.use("/api/v1/events", eventRoute);
app.use("/api/v1/version", versionRoute);
app.use("/api/v1/logs", logsRoute);
app.use("/api/v1/employees", employeeRoute);

module.exports = app;