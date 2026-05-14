// Jest global setup for CAP tests
const cds = require('@sap/cds');

module.exports = async () => {
  cds.test('serve', '--in-memory', '--with-mocks');
};
