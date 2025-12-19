import axios from 'axios'

const baseURL = "http://192.168.120.185:8086"; 

// 获取工厂下AMR及车间
export const getAgvInfoList = async (ftid) => {
  const res = await axios.get(`${baseURL}/api/getAgvInfoList`, { params: { ftid } });
  return res.data;
};

// 当前充电AMR列表
export const getChargingAmrList = async () => {
  const res = await axios.get(`${baseURL}/api/getChargingAmrList`);
  return res.data;
};

// 历史报警记录
export const getWarningList = async () => {
  const res = await axios.get(`${baseURL}/api/getWarningAmrList`)
  return res.data
}

// 工厂数量
export const getCountGroupByFactory = async (factoryId = '') => {
  const res = await axios.get(`${baseURL}/api/getCountGroupByFactoryId`, {
    params: { factoryId }
  })
  return res.data
}

// AMR 历史充电/电池相关曲线数据
export const getAmrChargeHistory = async (factoryId, amrId) => {
  const res = await axios.get(`${baseURL}/api/getAmrChargeHistory`, {
    params: { factoryId, amrId }
  })
  return res.data
}

// 创建工单（占位接口，按后端路径调整）
export const createWorkOrder = async (payload) => {
  const res = await axios.post(`${baseURL}/api/createWorkOrder`, payload)
  return res.data
}
