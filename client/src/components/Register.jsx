import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, User } from 'lucide-react';
import API_BASE from '../apiConfig';

const Register = ({ onRegister, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein');
            return;
        }

        if (password.length < 6) {
            setError('Das Passwort muss mindestens 6 Zeichen lang sein');
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userEmail', data.email);
                localStorage.setItem('userName', data.name || '');
                onRegister(data);
            } else {
                setError(data.message || 'Registrierung fehlgeschlagen');
            }
        } catch (err) {
            setError('Verbindung zum Server fehlgeschlagen');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-gray-100">
                <div className="flex items-center justify-center space-x-4 mb-10">
                    <img
                        src="/icons/fox-logo.png"
                        alt="CatchSensor Logo"
                        className="w-28 h-28 rounded-[2rem] shadow-xl border-2 border-[#1b3a2e]/5 object-contain bg-white"
                    />
                    <div className="text-left">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">CatchSensor</h1>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Konto erstellen</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-Mail Adresse</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none transition-all"
                                placeholder="name@beispiel.de"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Name (Optional)</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none transition-all"
                                placeholder="Ihr Name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Passwort</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none transition-all"
                                placeholder="Mindestens 6 Zeichen"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Passwort bestätigen</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-gray-900 focus:ring-2 focus:ring-green-700 outline-none transition-all"
                                placeholder="Passwort wiederholen"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#1b3a2e] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Registrieren</span>
                        <ArrowRight size={20} />
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={onSwitchToLogin}
                        className="text-gray-400 text-sm font-bold hover:text-green-700 transition-colors"
                    >
                        Bereits ein Konto? <span className="text-green-700 underline decoration-2 underline-offset-4">Anmelden</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;
