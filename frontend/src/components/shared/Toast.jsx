import { Toaster } from 'react-hot-toast'

export default function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#161b22',
          color: '#e6edf3',
          border: '1px solid #30363d',
          fontSize: '13px',
          borderRadius: '6px',
        },
        success: {
          iconTheme: {
            primary: '#238636',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#da3633',
            secondary: '#fff',
          },
        },
      }}
    />
  )
}
