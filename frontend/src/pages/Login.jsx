import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import AuthLayout from '../components/AuthLayout';
import { API_URL } from '../services/api';
import { authDestination, selectedAuthPlan } from '../utils/authFlow';

export default function Login() {
  const {search}=useLocation();
  const [email,setEmail]=useState('');
  const [senha,setSenha]=useState('');
  const [showSenha,setShowSenha]=useState(false);
  const [loading,setLoading]=useState(false);
  const [erro,setErro]=useState('');
  const [googleUnavailable,setGoogleUnavailable]=useState(false);
  const [googleWidth,setGoogleWidth]=useState(320);
  const busy=useRef(false), googleRef=useRef(null);
  const errorRef=useRef(null);
  useEffect(()=>{if(erro) errorRef.current?.focus();},[erro]);
  const complete=selectedAuthPlan(search)==='complete';
  const signupUrl=complete?'/cadastro?plano=complete':'/cadastro';
  useEffect(()=>{
    if(!googleRef.current) return;
    const observer=new ResizeObserver(entries=>setGoogleWidth(Math.max(200,Math.min(360,Math.floor(entries[0].contentRect.width)))));
    observer.observe(googleRef.current);return ()=>observer.disconnect();
  },[]);
  const authenticate=async(path,payload)=>{
    if(busy.current) return;
    busy.current=true;setLoading(true);setErro('');
    try {
      const response=await fetch(`${API_URL}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok || !data.success) throw new Error(data.error || 'Não foi possível entrar. Confira seus dados e tente novamente.');
      localStorage.setItem('token',data.token);
      localStorage.setItem('usuario',JSON.stringify({...data.usuario,clinica:data.clinica}));
      window.location.href=authDestination(search);
    } catch(error) {setErro(error.message==='Failed to fetch'?'Não foi possível conectar ao servidor. Tente novamente.':error.message);}
    finally {busy.current=false;setLoading(false);}
  };
  return <AuthLayout><div className="vc-auth-form-content">
    <header className="vc-auth-form-heading"><span>ACESSO À SUA CLÍNICA</span><h1>Bem-vindo de volta</h1><p>Entre com sua conta para continuar no VetCare.</p></header>
    <form className="vc-auth-form" onSubmit={e=>{e.preventDefault();authenticate('/auth/login',{email:email.trim(),senha});}} aria-busy={loading}>
      {new URLSearchParams(search).get('reason')==='expired' && <p className="vc-auth-alert info" role="status">Sua sessão terminou. Entre novamente para continuar.</p>}
      {erro && <div className="vc-auth-alert" role="alert" tabIndex={-1} ref={errorRef}><FiAlertCircle aria-hidden="true"/>{erro}</div>}
      <div className="vc-auth-field"><label htmlFor="login-email">E-mail de acesso</label><div className="vc-auth-input"><FiMail aria-hidden="true"/><input id="login-email" name="email" type="email" autoComplete="username" placeholder="voce@clinica.com.br" value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading}/></div></div>
      <div className="vc-auth-field"><label htmlFor="login-password">Senha</label><div className="vc-auth-input"><FiLock aria-hidden="true"/><input id="login-password" name="senha" type={showSenha?'text':'password'} autoComplete="current-password" placeholder="Sua senha" value={senha} onChange={e=>setSenha(e.target.value)} required disabled={loading}/><button className="vc-auth-eye" type="button" aria-label={showSenha?'Ocultar senha':'Mostrar senha'} aria-pressed={showSenha} onClick={()=>setShowSenha(s=>!s)}>{showSenha?<FiEyeOff/>:<FiEye/>}</button></div></div>
      <div className="vc-auth-forgot"><Link to="/recuperar-senha">Esqueceu sua senha?</Link></div>
      <button className="vc-auth-primary" type="submit" disabled={loading}>{loading?'Entrando…':'Entrar na plataforma'}<FiArrowRight aria-hidden="true"/></button>
    </form>
    {!googleUnavailable && <div className="vc-auth-divider">ou entre com Google</div>}
    <div className="vc-auth-google" ref={googleRef}>{googleUnavailable?<p className="vc-auth-hint" role="status">O acesso pelo Google está indisponível. Use seu e-mail e senha.</p>:<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '1057629123787-gskt2kvcok51e44dqtin4jkd93ks311q.apps.googleusercontent.com'} onScriptLoadError={()=>setGoogleUnavailable(true)}><GoogleLogin onSuccess={credential=>authenticate('/auth/google',{token:credential.credential})} onError={()=>setErro('Não foi possível entrar com o Google. Tente novamente ou use seu e-mail e senha.')} theme="outline" shape="rectangular" width={googleWidth} locale="pt-BR"/></GoogleOAuthProvider>}</div>
    <p className="vc-auth-switch">Ainda não tem uma conta?<Link to={signupUrl}>Criar minha clínica</Link></p>
  </div></AuthLayout>;
}
