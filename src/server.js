const http = require("http");
const app = require("./app");
const { connectDB } = require("./services/db");
const { ensureSeeded } = require("./services/users");
const { startDueReminderScheduler } = require("./services/reminderNotify");

const port = process.env.PORT || 3000;

const server = http.createServer(app);

connectDB().then(async () => {
    try {
        await ensureSeeded();
        console.log("CRM users seed ready");
    } catch (err) {
        console.error("CRM users seed failed:", err.message);
    }
    if (process.env.DISABLE_REMINDER_SCHEDULER === "true") {
        console.log("Due reminder scheduler disabled (DISABLE_REMINDER_SCHEDULER=true)");
    } else {
        startDueReminderScheduler();
    }
    server.listen(port, () => {
        console.log(`App running on port ${port}...`);
    });
});
