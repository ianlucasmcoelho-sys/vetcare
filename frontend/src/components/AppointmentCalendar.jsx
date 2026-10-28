import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiSettings, FiX } from 'react-icons/fi';
import { api, apiGet, apiPut } from '../services/api';
import { usePermission } from '../hooks/usePermission';
import './AppointmentCalendar.css';

const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const todayKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const parseDay = value => new Date(`${value}T12:00:00`);
const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function AppointmentCalendar({ initialDate, initialProfessional = '', initialDuration = 30, onBook, onEdit, onClose, refreshKey = 0 }) {
  const { isAdmin } = usePermission();
  const [selected, setSelected] = useState(initialDate || todayKey());
  const [month, setMonth] = useState(() => { const date=parseDay(initialDate || todayKey()); return new Date(date.getFullYear(),date.getMonth(),1,12); });
  const [professional, setProfessional] = useState(String(initialProfessional || ''));
  const [duration, setDuration] = useState(Number(initialDuration || 30));
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [monthEvents, setMonthEvents] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const days = useMemo(() => {
    const start = new Date(month.getFullYear(),month.getMonth(),1,12);
    start.setDate(start.getDate() - ((start.getDay()+6)%7));
    return Array.from({length:42},(_,index)=>{ const date=new Date(start); date.setDate(start.getDate()+index); return date; });
  },[month]);
  useEffect(() => {
    let active=true;
    Promise.all([apiGet('/agendamentos/profissionais'),apiGet('/agendamentos/expediente')]).then(async responses => {
      if (responses.some(response=>!response?.ok)) throw new Error('Não foi possível carregar os profissionais e o expediente.');
      const [people,config]=await Promise.all(responses.map(response=>response.json()));
      if(active){setStaff(people);setSettings(config);}
    }).catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[version]);
  const rangeStart=dayKey(days[0]); const rangeEnd=dayKey(days[41]);
  useEffect(()=>{
    const controller=new AbortController();
    api(`/agendamentos/periodo?${new URLSearchParams({dataInicio:rangeStart,dataFim:rangeEnd})}`,{signal:controller.signal}).then(async response=>{
      if(!response?.ok)throw new Error('Não foi possível carregar o calendário.');
      const result=await response.json();if(!controller.signal.aborted)setMonthEvents(result);
    }).catch(err=>{if(!controller.signal.aborted)setError(err.message);});
    return ()=>controller.abort();
  },[rangeStart,rangeEnd,version,refreshKey]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setAvailability(null);
    const params=new URLSearchParams({data:selected,duracao_minutos:String(duration)});if(professional)params.set('veterinario_id',professional);
    api(`/agendamentos/disponibilidade?${params}`,{signal:controller.signal}).then(async response=>{
      const result=response?await response.json():{};
      if(!response?.ok)throw new Error(result.error || 'Não foi possível consultar os horários.');
      if(!controller.signal.aborted)setAvailability(result);
    }).catch(err=>{if(!controller.signal.aborted)setError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[selected,professional,duration,version,refreshKey]);
  useEffect(()=>{
    if(!settingsOpen)return undefined;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const escape=event=>{if(event.key==='Escape')setSettingsOpen(false);};document.addEventListener('keydown',escape);
    return ()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',escape);};
  },[settingsOpen]);
  const counts=useMemo(()=>{
    const result={};for(const event of monthEvents){if(event.status==='Cancelado')continue;if(professional && event.veterinario_id && String(event.veterinario_id)!==professional)continue;result[event.data]=(result[event.data]||0)+1;}return result;
  },[monthEvents,professional]);
  const changeMonth=delta=>setMonth(previous=>new Date(previous.getFullYear(),previous.getMonth()+delta,1,12));
  const chooseDay=date=>{setSelected(dayKey(date));if(date.getMonth()!==month.getMonth()||date.getFullYear()!==month.getFullYear())setMonth(new Date(date.getFullYear(),date.getMonth(),1,12));};
  const isPast=time=>selected<todayKey() || (selected===todayKey() && time<=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()));
  const saveSettings=async event=>{
    event.preventDefault();setSaving(true);setError('');
    try{const response=await apiPut('/agendamentos/expediente',draft);const result=response?await response.json():{};if(!response?.ok)throw new Error(result.error || 'Não foi possível salvar o expediente.');setSettings(result);setSettingsOpen(false);setVersion(value=>value+1);}
    catch(err){setError(err.message);}finally{setSaving(false);}
  };
  return <section className="appointment-calendar" aria-labelledby="calendar-title">
    <header className="schedule-header"><div><span>PLANEJAMENTO CLÍNICO</span><h2 id="calendar-title"><FiCalendar /> Agenda completa</h2></div><div className="schedule-header-actions">{isAdmin()&&settings&&<button type="button" onClick={()=>{setDraft({...settings,dias_semana:[...settings.dias_semana]});setSettingsOpen(true);}}><FiSettings />Expediente</button>}<button type="button" onClick={onClose}><FiX />Voltar à lista</button></div></header>
    <div className="schedule-filters"><label>Profissional<select value={professional} onChange={event=>setProfessional(event.target.value)}><option value="">Agenda da clínica</option>{staff.map(person=><option key={person.id} value={person.id}>{person.nome}</option>)}</select></label><label>Duração do atendimento<select value={duration} onChange={event=>setDuration(Number(event.target.value))}>{[...new Set([15,30,45,60,90,120,Number(initialDuration||30)])].sort((a,b)=>a-b).map(value=><option key={value} value={value}>{value} minutos</option>)}</select></label></div>
    {settings && <p className="schedule-help">Expediente de referência: {settings.inicio} às {settings.fim}{settings.pausa_inicio ? ` · Intervalo: ${settings.pausa_inicio} às ${settings.pausa_fim}` : ''}. Ajuste o expediente para refletir a rotina da clínica.</p>}
    {error&&<div className="schedule-error" role="alert">{error}<button type="button" onClick={()=>setVersion(value=>value+1)}>Tentar novamente</button></div>}
    <div className="schedule-layout"><div className="schedule-month"><div className="schedule-month-heading"><button type="button" aria-label="Mês anterior" onClick={()=>changeMonth(-1)}><FiChevronLeft /></button><h3>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h3><button type="button" aria-label="Próximo mês" onClick={()=>changeMonth(1)}><FiChevronRight /></button></div><div className="schedule-weekdays">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day=><span key={day}>{day}</span>)}</div><div className="schedule-days">{days.map(date=>{
      const key=dayKey(date);const count=counts[key]||0;const closed=settings&&!settings.dias_semana.includes(date.getDay());
      return <button type="button" key={key} className={`${date.getMonth()!==month.getMonth()?'outside-month ':''}${key===selected?'selected ':''}${key===todayKey()?'today ':''}${closed?'closed':''}`} aria-pressed={key===selected} aria-label={`${date.toLocaleDateString('pt-BR')}, ${count} agendamentos${closed?', sem expediente':''}`} onClick={()=>chooseDay(date)}><strong>{date.getDate()}</strong>{count>0?<span>{count} {count===1?'consulta':'consultas'}</span>:<span>{closed?'Fechado':'—'}</span>}</button>;
    })}</div><button type="button" className="schedule-today" onClick={()=>chooseDay(parseDay(todayKey()))}>Ir para hoje</button><p className="schedule-help">Disponibilidade conforme o expediente e os agendamentos registrados. Reservas sem profissional ocupam a agenda da clínica.</p></div>
    <div className="schedule-day"><div className="schedule-day-heading"><div><span>HORÁRIOS DO DIA</span><h3>{parseDay(selected).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</h3></div><FiClock /></div>
      {loading?<p className="schedule-empty" role="status">Consultando disponibilidade...</p>:availability&&<>
        {!availability.aberto?<p className="schedule-empty">Sem expediente neste dia. Selecione outro dia no calendário.</p>:<><p className="schedule-help">Selecione um horário livre para agendar.</p><div className="schedule-slots">{availability.horarios.map(slot=>{const past=isPast(slot.horario);return <button type="button" key={slot.horario} disabled={!slot.disponivel||past} className={slot.disponivel&&!past?'free':''} onClick={()=>onBook({data:selected,horario:slot.horario,veterinario_id:professional,duracao_minutos:duration})}><strong>{slot.horario}</strong><span>{past?'Passado':slot.motivo}</span></button>;})}</div>{availability.horarios.length===0&&<p className="schedule-empty">A duração selecionada não cabe no expediente deste dia.</p>}</>}
        <h4 className="schedule-appointments-title">Agendamentos do dia ({availability.agendamentos.length})</h4>{availability.agendamentos.length?<ul className="schedule-appointments">{availability.agendamentos.map(row=><li key={row.id}><button type="button" onClick={()=>onEdit(row)}><time>{row.horario}</time><div><strong>{row.animal_nome||'Paciente'}</strong><span>{row.veterinario_nome||'Agenda da clínica'} · {row.duracao_minutos||30} min</span></div><span>{row.status}</span></button></li>)}</ul>:<p className="schedule-empty">Nenhum atendimento registrado para este dia e profissional.</p>}
      </>}
    </div></div>
    {settingsOpen&&draft&&createPortal(<div className="schedule-settings-overlay" onClick={()=>setSettingsOpen(false)}><section className="schedule-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-settings-title" onClick={event=>event.stopPropagation()}><header><h2 id="schedule-settings-title">Expediente da clínica</h2><button type="button" aria-label="Fechar expediente" onClick={()=>setSettingsOpen(false)}><FiX /></button></header><form onSubmit={saveSettings}><p>Configure os dias e horários usados para sugerir disponibilidade. Os agendamentos já registrados serão preservados.</p><div className="schedule-settings-grid">{[['inicio','Abertura'],['fim','Encerramento'],['pausa_inicio','Início do intervalo'],['pausa_fim','Fim do intervalo']].map(([key,label])=><label key={key}>{label}<input autoFocus={key==='inicio'} type="time" required={key==='inicio'||key==='fim'} value={draft[key]} onChange={event=>setDraft(previous=>({...previous,[key]:event.target.value}))}/></label>)}</div><small>Para não usar intervalo, deixe os dois campos vazios.</small><label className="schedule-interval">Intervalos da grade<select value={draft.intervalo} onChange={event=>setDraft(previous=>({...previous,intervalo:Number(event.target.value)}))}>{[15,30,60].map(value=><option key={value} value={value}>{value} minutos</option>)}</select></label><fieldset><legend>Dias de atendimento</legend>{weekDays.map((day,index)=><label key={day}><input type="checkbox" checked={draft.dias_semana.includes(index)} onChange={event=>setDraft(previous=>({...previous,dias_semana:event.target.checked?[...previous.dias_semana,index]:previous.dias_semana.filter(value=>value!==index)}))}/>{day}</label>)}</fieldset>{error&&<p className="schedule-error" role="alert">{error}</p>}<footer><button type="button" onClick={()=>setSettingsOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={saving}>{saving?'Salvando...':'Salvar expediente'}</button></footer></form></section></div>,document.body)}
  </section>;
}
