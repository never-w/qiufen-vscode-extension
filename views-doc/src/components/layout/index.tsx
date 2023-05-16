import React, { FC } from 'react'
import styles from './index.module.less'
import logo from '@/assets/images/logo.png'

interface IProps {
  children: React.ReactNode
}

const Layout: FC<IProps> = ({ children }) => {
  return (
    <div>
      <div className={styles.topBar}>
        <img src={logo} alt="qiufen logo" className={styles.logo} />
        <p className={styles.title}>QIUFEN</p>
      </div>
      <div className={styles.section}>
        <div className={styles.sideBar}>21</div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}

export default Layout
