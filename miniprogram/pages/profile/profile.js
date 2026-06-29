const api = require('../../utils/api.js');

Page({
  data: {
    loggedIn: false,
    reports: [],
    loading: false,
  },
  onShow() {
    this.setData({ loggedIn: !!api.getToken() });
    if (api.getToken()) this.loadReports();
  },
  async doLogin() {
    this.setData({ loading: true });
    try {
      await api.ensureLogin();
      this.setData({ loggedIn: true });
      await this.loadReports();
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async loadReports() {
    try {
      const res = await api.listReports();
      this.setData({ reports: res.data || [] });
    } catch (err) {
      this.setData({ reports: [] });
    }
  },
  openReport(e) {
    wx.navigateTo({ url: '/pages/report/report?id=' + e.currentTarget.dataset.id });
  },
  logout() {
    api.clearToken();
    this.setData({ loggedIn: false, reports: [] });
  },
  goExplore() {
    wx.navigateTo({ url: '/pages/input/input' });
  },
});
