const express = require("express");
const cors = require("cors");
const http = require("http");
const {Server}=require("socket.io");
const mongoose = require("mongoose");

const app = express();
const Server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });


app.get("/", (req, res) => {
  res.json({
    message: "TransitPulse backend is running",
  });
});


app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TransitPulse API is working",
  });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);


  socket.on("bus-location", (data) => {
    console.log("Bus location received:", data);


    io.emit("bus-location-update", data);
  });

  socket.on("start-trip", (data) => {
    console.log("Trip started:", data);

    io.emit("trip-started", data);
  });


  socket.on("end-trip", (data) => {
    console.log("Trip ended:", data);

    io.emit("trip-ended", data);
  });


  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("TransitPulse server running on port ${PORT}");
});