import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-on-background selection:bg-primary-container selection:text-on-primary-container bg-[#0a0e17] relative">
      <style>{`
        body {
            background-color: #0a0e17; /* Specific void background requested */
            background-image: 
                radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 50% 100%, rgba(255, 180, 171, 0.03) 0%, transparent 50%);
        }
      `}</style>
      
      {/* Ambient glow behind the main card */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] opacity-50 mix-blend-screen"></div>
      </div>
      
      {/* Main Content Canvas */}
      <main className="relative z-10 w-full max-w-md px-4 md:px-8 flex flex-col items-center text-center">
        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mb-8 shadow-[0_0_30px_-5px_rgba(255,180,171,0.2)]">
          <Lock size={32} className="text-error" />
        </div>
        
        {/* 403 Gradient Text */}
        <h1 className="font-h1 text-[48px] md:text-[56px] font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-br from-primary-container via-inverse-primary to-error drop-shadow-sm leading-tight">
          403
        </h1>
        
        {/* Headings */}
        <h2 className="font-h2 text-[24px] md:text-[30px] font-semibold text-on-surface mb-4 tracking-tight">
          Access Denied
        </h2>
        <p className="font-body-lg text-[16px] text-on-surface-variant mb-12 max-w-[320px]">
          You don't have permission to view this page or perform this action.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-12">
          <Link 
            to="/login"
            className="px-6 py-2.5 rounded-lg font-label-md text-[14px] font-medium text-white bg-gradient-to-r from-primary-container to-inverse-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 active:scale-95 transition-all duration-200 border border-transparent inline-flex items-center justify-center"
          >
            Go to Login
          </Link>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-lg font-label-md text-[14px] font-medium text-primary bg-transparent border border-outline-variant hover:bg-surface-variant/50 hover:text-primary-fixed active:scale-95 transition-all duration-200 inline-flex items-center justify-center"
          >
            Go Back
          </button>
        </div>
        
        {/* Footer / Support Text */}
        <div className="pt-8 border-t border-outline-variant/20 w-full">
          <p className="font-label-md text-[12px] font-medium text-outline">
            Contact your system administrator if you believe this is a mistake.<br/>
            <Link to="#" className="text-primary hover:text-primary-fixed underline decoration-primary/30 underline-offset-4 transition-colors mt-1 inline-block">Request Access</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
