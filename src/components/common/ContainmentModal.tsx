import React, { useState } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  X
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const ContainmentModal: React.FC = () => {
  const { 
    isContainmentModalOpen, 
    closeContainmentModal, 
    containmentAction, 
    executeContainment,
    employees 
  } = useSecurity();

  const [isExecuting, setIsExecuting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isContainmentModalOpen || !containmentAction) return null;

  const targetEmp = employees.find(e => e.id === containmentAction.employeeId) || employees[0];

  const getActionTitle = () => {
    switch (containmentAction.actionType) {
      case 'ISOLATE':
        return 'NETWORK HOST ISOLATION (EDR QUARANTINE)';
      case 'REVOKE_TOKENS':
        return 'REVOKE ACTIVE OIDC & KERBEROS SESSIONS';
      case 'STEP_UP_MFA':
        return 'FORCE FIDO2 STEP-UP AUTHENTICATION CHALLENGE';
      case 'QUARANTINE_FILE':
        return 'QUARANTINE S3 STAGING BLOB';
      default:
        return 'EXECUTE SECURITY CONTAINMENT PLAYBOOK';
    }
  };

  const handleConfirm = () => {
    setIsExecuting(true);
    setTimeout(() => {
      executeContainment(containmentAction.employeeId, containmentAction.actionType);
      setIsExecuting(false);
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        closeContainmentModal();
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 font-mono select-none">
      <div 
        className="cyber-panel rounded-xl max-w-md w-full p-4 space-y-4 shadow-2xl border border-[#FF334B]/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
          <div className="flex items-center gap-2 text-[#FF334B]">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#E8FFF0]">
              CONFIRM CONTAINMENT ACTION
            </h3>
          </div>

          <button 
            onClick={closeContainmentModal}
            className="text-[#8CA798] hover:text-[#FF334B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[#020605] border border-[#FF334B]/30 space-y-1.5">
            <div className="text-[10px] text-[#8CA798] font-bold">TARGET ACTION:</div>
            <div className="text-xs font-bold text-[#FF334B]">{getActionTitle()}</div>
            <div className="text-xs text-[#E8FFF0]">
              Target Subject: <strong>{targetEmp.name} ({targetEmp.id})</strong>
            </div>
            <div className="text-[11px] text-[#73FFA5]">
              Managed Endpoint: <strong>{targetEmp.device}</strong>
            </div>
          </div>

          <p className="text-[11px] text-[#8CA798] leading-relaxed">
            This action immediately disconnects network adapters, terminates active Kerberos TGT tickets, and isolates host from internal subnets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#18E66A]/15">
          <button
            onClick={closeContainmentModal}
            disabled={isExecuting}
            className="px-3 py-1.5 rounded-lg bg-[#0A1C13] hover:bg-[#0D261A] text-[#8CA798] border border-[#18E66A]/20 text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isExecuting || isDone}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all ${
              isDone
                ? 'bg-[#18E66A] text-[#020605]'
                : 'bg-[#FF334B] hover:bg-[#FF334B]/80 text-white'
            }`}
          >
            {isExecuting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{isDone ? 'Containment Enforced' : isExecuting ? 'Executing...' : 'Authorize & Execute'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
