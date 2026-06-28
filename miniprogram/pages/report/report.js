const { markdownToNodes } = require('../../utils/md.js');
const { formatReportContent } = require('../../utils/reportFormat.js');

Page({
  data: {
    loading: true,
    reportId: '',
    name: '',
    baziString: '',
    nodes: [],
    isUnlocked: false,
  },
  onLoad(options) {
    this.reportId = options.id;
    if (!this.reportId) {
      wx.showToast({ title: '报告不存在', icon: 'none' });
      return;
    }
    this.loadReport();
  },
  async loadReport() {
    this.setData({ loading: true });
    try {
      const api = require('../../utils/api.js');
      let res;
      try {
        res = await api.getReport(this.reportId);
      } catch (e) {
        res = await this.fetchPublicReport();
      }
      const data = res.data;
      const raw = data.content || data.fullContent || data.previewContent || '';
      const content = formatReportContent(raw);
      this.setData({
        loading: false,
        reportId: this.reportId,
        name: data.name || '',
        baziString: data.baziString || '',
        nodes: markdownToNodes(content),
        isUnlocked: !!data.isUnlocked,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },
  fetchPublicReport() {
    const { API_BASE } = require('../../config.js');
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_BASE + '/report/' + this.reportId,
        success(res) {
          if (res.data && res.data.success) resolve(res.data);
          else reject(new Error((res.data && res.data.error) || '加载失败'));
        },
        fail: () => reject(new Error('网络错误')),
      });
    });
  },
  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
