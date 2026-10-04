import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Network } from '@capacitor/network';
import { Provider } from '@/components/provider';
import { Shell } from '@/components/shell';
import Login from '@/app/login/page';
import Dashboard from '@/app/dashboard/page';
import Customers from '@/app/dashboard/customers/page';
import Invitations from '@/app/dashboard/invitations/page';
import NewInvitation from '@/app/dashboard/invitations/new/page';
import Feedback from '@/app/dashboard/feedback/page';
import Reviews from '@/app/dashboard/reviews/page';
import Settings from '@/app/dashboard/settings/page';
import Setup from '@/app/dashboard/setup/page';
import { prepareNative } from './native';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@/app/globals.css';
import './mobile.css';
function Connectivity() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let active = true;
    void Network.getStatus().then(s => { if (active) setOffline(!s.connected); });
    const listener = Network.addListener('networkStatusChange', s => setOffline(!s.connected));
    return () => { active = false; void listener.then(h => h.remove()); };
  }, []);
  return offline ? <div className="native-offline" role="status">Geen internet. Verbind om gegevens op te halen of op te slaan.</div> : null;
}
function Application() {
  return <HashRouter><Provider><Connectivity /><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<Shell><Outlet /></Shell>}>
      <Route index element={<Dashboard />} /><Route path="customers" element={<Customers />} />
      <Route path="invitations" element={<Invitations />} /><Route path="invitations/new" element={<NewInvitation />} />
      <Route path="feedback" element={<Feedback />} /><Route path="reviews" element={<Reviews />} />
      <Route path="settings" element={<Settings />} /><Route path="setup" element={<Setup />} />
    </Route><Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></Provider></HashRouter>;
}
prepareNative().then(() => createRoot(document.getElementById('root')!).render(<Application />)).catch(() => {
  document.getElementById('root')!.textContent = 'TrustPulse kon niet starten. Sluit de app en probeer opnieuw.';
});
