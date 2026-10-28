export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
export function selectedAuthPlan(search='') {
  return ['complete','pro','premium','clinica'].includes(new URLSearchParams(search).get('plano'))?'complete':'free';
}
export function authDestination(search='') {
  return selectedAuthPlan(search)==='complete'?'/checkout?plano=complete':'/';
}
