// Models and alert helper for Sanchar Saathi (In-memory storage)

function createAlertModel(busNumber, type, message, severity = 'MEDIUM') {
  return {
    id: 'ALT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    busNumber,
    type,
    message,
    severity,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  createAlertModel
};
