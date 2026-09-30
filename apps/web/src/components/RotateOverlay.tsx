import React,{useEffect,useState} from 'react';
import {PixelIcon} from './pixel';
export const RotateOverlay:React.FC=()=>{
 const [portrait,setPortrait]=useState(false);
 useEffect(()=>{const check=()=>setPortrait(window.innerHeight>window.innerWidth&&window.innerWidth<768);check();window.addEventListener('resize',check);return()=>window.removeEventListener('resize',check);},[]);
 return portrait?<div className="rotate-screen"><PixelIcon name="warehouse" size={54}/><h2>Xoay ngang để ghé tiệm</h2><p>Màn hình ngang giúp bạn nhìn rõ các kệ hàng và dễ điều khiển Cô Năm.</p></div>:null;
};
