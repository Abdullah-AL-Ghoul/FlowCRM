import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { CommandPalette } from '../common/CommandPalette';
import { FlowAICopilot } from '../../features/ai/components/FlowAICopilot';
import { MeetingIntelligenceModal } from '../../features/ai/components/MeetingIntelligenceModal';
import { AISalesWriterModal } from '../../features/ai/components/AISalesWriterModal';
import { ContractAnalysisModal } from '../../features/ai/components/ContractAnalysisModal';
import { ContactFormModal } from '../../features/contacts/ContactFormModal';
import { DealFormModal } from '../../features/deals/DealFormModal';
import { TaskFormModal } from '../../features/tasks/TaskFormModal';

export const AppLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [salesWriterOpen, setSalesWriterOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Global keyboard shortcut for Command Palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          onOpenContractModal={() => setContractModalOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenContactModal={() => setContactModalOpen(true)}
        onOpenDealModal={() => setDealModalOpen(true)}
        onOpenTaskModal={() => setTaskModalOpen(true)}
        onOpenCopilot={() => setCopilotOpen(true)}
        onOpenSalesWriter={() => setSalesWriterOpen(true)}
        onOpenMeetingModal={() => setMeetingModalOpen(true)}
      />

      {/* Quick Action Modals */}
      {contactModalOpen && (
        <ContactFormModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
        />
      )}

      {dealModalOpen && (
        <DealFormModal
          isOpen={dealModalOpen}
          onClose={() => setDealModalOpen(false)}
        />
      )}

      {taskModalOpen && (
        <TaskFormModal
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
        />
      )}

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

      {/* Global Contract Intelligence Modal */}
      {contractModalOpen && (
        <ContractAnalysisModal
          isOpen={contractModalOpen}
          onClose={() => setContractModalOpen(false)}
        />
      )}
    </div>
  );
};

