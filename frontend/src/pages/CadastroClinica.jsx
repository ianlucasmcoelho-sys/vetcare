import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle, FiArrowRight, FiCheck } from 'react-icons/fi';
import { TbBuildingHospital } from 'react-icons/tb';
import AuthLayout from '../components/AuthLayout';
import { API_URL } from '../services/api';
import { PASSWORD_RULE, authDestination, selectedAuthPlan } from '../utils/authFlow';

export default function CadastroClinica() {
  const {search}=useLocation();
  const complete=selectedAuthPlan(search)==='complete';
  const [form,setForm]=useState({clinica_nome:'',clinica_cnpj:'',clinica_telefone:'',clinica_email:'',admin_nome:'',admin_email:'',admin_senha:'',admin_confirm_senha:''});
  const [loading,setLoading]=useState(false),[erro,setErro]=useState(''),[sucesso,setSucesso]=useState(false);
  const [showSenha,setShowSenha]=useState(false),[showConfirm,setShowConfirm]=useState(false);
  const busy=useRef(false);
  const errorRef=useRef(null);
  useEffect(()=>{if(erro) errorRef.current?.focus();},[erro]);
  const rules=[['8 ou mais caracteres',form.admin_senha.length>=8],['Maiúscula e minúscula',/[A-Z]/.test(form.admin_senha)&&/[a-z]/.test(form.admin_senha)],['Número',/\d/.test(form.admin_senha)],['Símbolo',/[@$!%*?&.]/.test(form.admin_senha)]];
  const submit=async event=>{
    event.preventDefault();if(busy.current||sucesso) return;setErro('');
    if(!PASSWORD_RULE.test(form.admin_senha)) {setErro('Use ao menos 8 caracteres, com maiúscula, minúscula, número e um dos símbolos: @$!%*?&.');return;}
    if(form.admin_senha!==form.admin_confirm_senha) {setErro('As senhas não coincidem. Confira a confirmação da senha.');return;}
    busy.current=true;setLoading(true);
    try {
      const payload={...form,clinica_nome:form.clinica_nome.trim(),admin_nome:form.admin_nome.trim(),admin_email:form.admin_email.trim(),clinica_email:form.clinica_email.trim()};
      const response=await fetch(`${API_URL}/auth/cadastro-clinica`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success) throw new Error(data.error||'Não foi possível criar sua clínica. Confira os dados e tente novamente.');
      setSucesso(true);localStorage.setItem('token',data.token);localStorage.setItem('usuario',JSON.stringify({...data.usuario,clinica:data.clinica}));
      window.location.href=authDestination(search);
    } catch(error) {setErro(error.message==='Failed to fetch'?'Não foi possível conectar ao servidor. Tente novamente.':error.message);}
    finally {busy.current=false;setLoading(false);}
  };
  const field=(name,label,Icon,options={})=><div className={`vc-auth-field ${options.full?'vc-auth-full':''}`} key={name}><label htmlFor={`signup-${name}`}>{label}</label><div className="vc-auth-input"><Icon aria-hidden="true"/><input id={`signup-${name}`} name={name} type={options.type||'text'} autoComplete={options.autoComplete} placeholder={options.placeholder||''} value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})} required={options.required||false} disabled={loading||sucesso} maxLength={options.maxLength||160}/></div></div>;
  const password=(name,label,visible,toggle)=><div className="vc-auth-field"><label htmlFor={`signup-${name}`}>{label}</label><div className="vc-auth-input"><FiLock aria-hidden="true"/><input id={`signup-${name}`} name={name} type={visible?'text':'password'} autoComplete="new-password" value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})} aria-describedby={name==='admin_senha'?'signup-password-hint':undefined} required disabled={loading||sucesso} maxLength={128}/><button type="button" className="vc-auth-eye" aria-label={`${visible?'Ocultar':'Mostrar'} ${name==='admin_senha'?'senha':'confirmação de senha'}`} aria-pressed={visible} onClick={toggle}>{visible?<FiEyeOff/>:<FiEye/>}</button></div></div>;
  return <AuthLayout signup complete={complete}><div className="vc-auth-form-content">
    <header className="vc-auth-form-heading"><span>{complete?'VETCARE COMPLETO':'COMECE PELO TESTE GRATUITO'}</span><h1>Crie o espaço da sua clínica</h1><p>Preencha os dados abaixo para começar.</p></header>
    <form className="vc-auth-form" onSubmit={submit} aria-busy={loading}>
      {erro && <div className="vc-auth-alert" role="alert" tabIndex={-1} ref={errorRef}><FiAlertCircle aria-hidden="true"/>{erro}</div>}
      {sucesso && <div className="vc-auth-alert success" role="status"><FiCheckCircle aria-hidden="true"/>Clínica criada. Preparando seu acesso…</div>}
      <fieldset><legend><TbBuildingHospital aria-hidden="true"/>Dados da clínica</legend><div className="vc-auth-grid">
        {field('clinica_nome','Nome da clínica',TbBuildingHospital,{required:true,full:true,autoComplete:'organization',placeholder:'Como sua clínica se chama?'})}
        {field('clinica_telefone','Telefone (opcional)',FiPhone,{type:'tel',autoComplete:'tel',placeholder:'DDD + número',maxLength:25})}
        {field('clinica_email','E-mail comercial (opcional)',FiMail,{type:'email',autoComplete:'email',placeholder:'E-mail da clínica'})}
      </div></fieldset>
      <fieldset><legend><FiUser aria-hidden="true"/>Seu acesso de administrador</legend><div className="vc-auth-grid">
        {field('admin_nome','Seu nome completo',FiUser,{required:true,full:true,autoComplete:'name',placeholder:'Nome e sobrenome'})}
        {field('admin_email','E-mail de acesso',FiMail,{required:true,full:true,type:'email',autoComplete:'username',placeholder:'voce@clinica.com.br'})}
        {password('admin_senha','Crie uma senha',showSenha,()=>setShowSenha(s=>!s))}
        {password('admin_confirm_senha','Confirme sua senha',showConfirm,()=>setShowConfirm(s=>!s))}
      </div><p className="vc-auth-hint" id="signup-password-hint">Use maiúscula, minúscula, número e um símbolo: @$!%*?&.</p><ul className="vc-auth-password-rules" aria-label="Requisitos da senha">{rules.map(([label,met])=><li key={label} data-met={met}><FiCheck aria-hidden="true"/>{label}</li>)}</ul></fieldset>
      <div><p className="vc-auth-plan-note">{complete?'Após o cadastro, você será direcionado ao pagamento do VetCare Completo por R$ 97/mês. Criar a conta não realiza cobrança.':'Teste gratuito por 7 dias, sem cartão. Após esse período, o VetCare Completo custa R$ 97/mês para continuar usando o sistema.'}</p><button type="submit" className="vc-auth-primary" disabled={loading||sucesso} style={{marginTop:16}}>{sucesso?'Preparando acesso…':loading?'Criando sua clínica…':complete?'Criar conta e continuar':'Criar minha clínica'}<FiArrowRight aria-hidden="true"/></button><p className="vc-auth-switch">Já usa o VetCare?<Link to={complete?'/login?plano=complete':'/login'}>Entrar na minha conta</Link></p></div>
    </form>
  </div></AuthLayout>;
}
