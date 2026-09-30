import React,{useState} from 'react';
import {PixelDialog,PixelButton} from './pixel';
interface Props {onManualSave:()=>Promise<boolean>;onResetSave:()=>Promise<boolean>;onClose:()=>void;lastSavedAt?:string;revision?:number;}
export const SaveModal:React.FC<Props>=({onManualSave,onResetSave,onClose,lastSavedAt,revision=1})=>{
 const [confirm,setConfirm]=useState(false),[pending,setPending]=useState(false),[status,setStatus]=useState(''),[failed,setFailed]=useState(false);
 const perform=async(reset:boolean)=>{setPending(true);setStatus(reset?'Đang mở tiệm mới...':'Đang ghi lại tiến trình...');setFailed(false);try{const ok=await(reset?onResetSave():onManualSave());setFailed(!ok);setStatus(ok?(reset?'Tiệm mới đã sẵn sàng.':'Đã lưu tiến trình thành công.'):'Chưa lưu được. Hãy thử lại.');if(ok&&reset)setConfirm(false);}catch{setFailed(true);setStatus('Chưa lưu được. Hãy thử lại.');}finally{setPending(false);}};
 return <PixelDialog title="Giữ lại chuyện của tiệm" subtitle="Tiến trình được lưu trên trình duyệt này" icon="save" onClose={onClose}>
  <div className="info-card"><div className="section-label"><span>Lần lưu thành công gần nhất</span><strong>{lastSavedAt?new Date(lastSavedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa có'}</strong></div><div className="section-label"><span>Lần ghi tiến trình</span><strong>#{revision}</strong></div></div>
  <div className="info-card"><p>Tiệm tự lưu mỗi 30 giây và khi qua ngày mới. Bạn cũng có thể lưu trước khi rời tiệm.</p><p className="muted">Tiến trình nằm trên máy này. Xóa dữ liệu trình duyệt có thể làm mất bản lưu.</p></div>
  <div className="save-actions"><PixelButton icon="save" variant="teal" disabled={pending} onClick={()=>perform(false)}>Lưu tiến trình ngay</PixelButton><PixelButton disabled={pending} onClick={()=>setConfirm(true)}>Mở tiệm mới từ đầu</PixelButton></div>
  {status&&<p role="status" className={`save-status ${failed?'error':''}`}>{status}</p>}
  {confirm&&<div className="save-confirm"><p><strong>Chơi lại từ ngày 1?</strong> Tiền và hàng của bản lưu hiện tại sẽ được thay bằng tiệm mới.</p><div><PixelButton variant="brick" disabled={pending} onClick={()=>perform(true)}>Đồng ý chơi lại</PixelButton><PixelButton disabled={pending} onClick={()=>setConfirm(false)}>Giữ lại tiệm</PixelButton></div></div>}
 </PixelDialog>;
};
