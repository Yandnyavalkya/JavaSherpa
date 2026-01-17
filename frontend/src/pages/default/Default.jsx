import React from 'react'
import Header from '../../layout/Header/Header'
import { Outlet } from 'react-router-dom'
import StarBackground from '../../components/StarBackground/StarBackground'

const Default = () => {
  return (
    <>
    <StarBackground />
    <Header/>
    <Outlet/>
    </>
  )
}

export default Default