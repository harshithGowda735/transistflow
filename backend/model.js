const mongoose  = require("mongoose");
 mongoose.Schema({
    busNumber:{
        type:String,
        required:true,
        unique:true,
    }
    ,
    outeName: {
      type: String,
      required: true,
    },

    conductorId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["IDLE", "ACTIVE", "DELAYED", "COMPLETED"],
      default: "IDLE",
    },

    currentLocation: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },

    lastUpdated: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const locationSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
    },

    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },

    lat: {
      type: Number,
      required: true,
    },

    lng: {
      type: Number,
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Bus = mongoose.model("Bus", busSchema);
const Trip = mongoose.model("Trip", tripSchema);
const Location = mongoose.model("Location", locationSchema);

module.exports = {
  Bus,
  Trip,
  Location,
};