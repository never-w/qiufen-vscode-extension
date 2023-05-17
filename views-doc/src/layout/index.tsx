import React, { FC, useState } from 'react'
import styles from './index.module.less'
import logo from '@/assets/images/logo.png'
import { FileOutlined, HomeTwoTone, HomeOutlined, FileTwoTone } from '@ant-design/icons'
import classnames from 'classnames'
import { Link, Outlet } from 'react-router-dom'

interface IProps {}

export enum SideBarIconKey {
  HOME = 'HOME',
  DOCS = 'DOCS',
  NONE = 'NONE',
}

const Layout: FC<IProps> = () => {
  const [sideBarActiveKey, setSideBarActiveKey] = useState(SideBarIconKey.DOCS)
  const [focusKey, setFocusKey] = useState(SideBarIconKey.DOCS)

  return (
    <div>
      <div className={styles.topBar}>
        <img src={logo} alt="qiufen logo" className={styles.logo} />
        <p className={styles.title}>QIUFEN</p>
      </div>
      <div className={styles.section}>
        <div className={styles.sideBar}>
          <div
            onMouseEnter={() => {
              setFocusKey(SideBarIconKey.DOCS)
            }}
            onMouseLeave={() => {
              setFocusKey(SideBarIconKey.NONE)
            }}
            onClick={() => {
              setSideBarActiveKey(SideBarIconKey.DOCS)
            }}
            className={classnames(styles.icon_item, {
              [styles.active]: sideBarActiveKey === SideBarIconKey.DOCS || focusKey === SideBarIconKey.DOCS,
            })}
          >
            <Link to="/">
              {sideBarActiveKey === SideBarIconKey.DOCS || focusKey === SideBarIconKey.DOCS ? (
                <FileTwoTone className={styles.icon} />
              ) : (
                <FileOutlined className={styles.icon} />
              )}
            </Link>
          </div>
          {/* ----------- */}
          <div
            onMouseEnter={() => {
              setFocusKey(SideBarIconKey.HOME)
            }}
            onMouseLeave={() => {
              setFocusKey(SideBarIconKey.NONE)
            }}
            onClick={() => {
              setSideBarActiveKey(SideBarIconKey.HOME)
            }}
            className={classnames(styles.icon_item, {
              [styles.active]: sideBarActiveKey === SideBarIconKey.HOME || focusKey === SideBarIconKey.HOME,
            })}
          >
            <Link to="/home">
              {sideBarActiveKey === SideBarIconKey.HOME || focusKey === SideBarIconKey.HOME ? (
                <HomeTwoTone className={styles.icon} />
              ) : (
                <HomeOutlined className={styles.icon} />
              )}
            </Link>
          </div>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
