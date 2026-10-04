import { useLocation, useNavigate, useSearchParams as useParams } from 'react-router-dom';
export const usePathname = () => useLocation().pathname;
export const useSearchParams = () => useParams()[0];
export function useRouter() {
  const navigate = useNavigate();
  return { push: (url: string) => navigate(url), replace: (url: string) => navigate(url, { replace: true }), back: () => navigate(-1) };
}
