const { createApp } = require('../src/server');
const { refreshFreeModels } = require('../src/config/models');
let app;
let ready = false;
async function getApp() {
  if (!ready) {
    await refreshFreeModels().catch(()=>{});
    app = createApp();
    ready = true;
  }
  return app;
}
module.exports = async (req, res) => {
  const a = await getApp();
  return a(req, res);
};
