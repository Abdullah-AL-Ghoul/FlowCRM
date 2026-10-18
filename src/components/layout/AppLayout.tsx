import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { FlowAICopilot } from '../../features/ai/components/FlowAICopilot';
import { MeetingIntelligenceModal } from '../../features/ai/components/MeetingIntelligenceModal';
import { AISalesWriterModal } from '../../features/ai/components/AISalesWriterModal';

export const AppLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [salesWriterOpen, setSalesWriterOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <Sidebar onToggleCopilot={() => setCopilotOpen(prev => !prev)} />

      {/* Mobile Nav Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleMobileNav={() => setMobileNavOpen(true)}
          onToggleCopilot={() => setCopilotOpen(prev => !prev)}
          onOpenMeetingModal={() => setMeetingModalOpen(true)}
          onOpenSalesWriter={() => setSalesWriterOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global FlowAI Copilot Drawer */}
      <FlowAICopilot
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

      {/* Global Meeting Intelligence Modal */}
      {meetingModalOpen && (
        <MeetingIntelligenceModal
          isOpen={meetingModalOpen}
          onClose={() => setMeetingModalOpen(false)}
        />
      )}

      {/* Global Sales Writer Modal */}
      {salesWriterOpen && (
        <AISalesWriterModal
          isOpen={salesWriterOpen}
          onClose={() => setSalesWriterOpen(false)}
        />
      )}
    </div>
  );
};

