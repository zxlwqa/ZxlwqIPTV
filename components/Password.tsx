import React, { useState } from 'react';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

interface PasswordProps {
  onSuccess: () => void;
}

const Password: React.FC<PasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Save authentication state
        localStorage.setItem('iptv_authenticated', 'true');
        localStorage.setItem('iptv_auth_timestamp', Date.now().toString());
        onSuccess();
      } else {
        setError('密码错误，请重试');
        setPassword('');
      }
    } catch (err) {
      setError('验证失败，请检查网络连接');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
      <div className="bg-surface w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
              <img src="./zxlwq.webp" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">密码保护</h2>
              <p className="text-zinc-400 text-sm">请输入密码访问播放器</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-2">
                密码
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="请输入密码"
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
                autoFocus
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full flex items-center justify-center px-4 py-3 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  确认
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Password;
