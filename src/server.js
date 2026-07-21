const http = require("http");
const app = require("./app");
const { connectDB } = require("./services/db");

const port = process.env.PORT || 3000;

const server = http.createServer(app);

connectDB().then(() => {
    server.listen(port, () => {
        console.log(`App running on port ${port}...`);
    });
});