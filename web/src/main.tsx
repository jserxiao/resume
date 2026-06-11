import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './styles/global.less'
import App from './App'

const theme = {
  token: {
    colorPrimary: '#1a56db',
    borderRadius: 6,
    fontSize: 14,
    colorBgContainer: '#ffffff',
    colorBorder: '#e5e7eb',
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
