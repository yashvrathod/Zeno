'use client';

import React from 'react';
import { ArrowLeft, MapPin, Linkedin, Github, Eye, Award, Edit, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Globe } from 'lucide-react';
import { Target} from 'lucide-react';

type ProfileUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  languages: string[];
  skills: string[];
  quote: string[];
};

async function fetchMe(): Promise<ProfileUser> {
  const res = await fetch('/api/profile/me', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load profile');
  const data = await res.json();
  return data.user;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [user, setUser] = React.useState<ProfileUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '', image: '', bio: '', location: '', websiteUrl: '', linkedinUrl: '', githubUrl: '', languages: '', skills: '', quote: '',
  });

  React.useEffect(() => {
    fetchMe().then(setUser).finally(() => setLoading(false));
  }, []);

  const openEdit = () => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      image: user.image ?? '',
      bio: user.bio ?? '',
      location: user.location ?? '',
      websiteUrl: user.websiteUrl ?? '',
      linkedinUrl: user.linkedinUrl ?? '',
      githubUrl: user.githubUrl ?? '',
      languages: user.languages.join(', '),
      skills: user.skills.join(', '),
      quote: user.quote.join('\n'),
    });
    setEditOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        quote: form.quote.split('\n').map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setUser(data.user);
      await updateSession();
      setEditOpen(false);
      toast.success('Identity registry updated.');
    } catch (e) {
      toast.error('Sync failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-background/50 selection:bg-primary/10">
          <div className="max-w-6xl mx-auto px-10 py-16">
            
            {/* Profile Hero - Claude Style */}
            <div className="mb-16">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
                <div className="relative group">
                  <Avatar className="w-32 h-32 rounded-[2.5rem] border-4 border-card shadow-xl grayscale hover:grayscale-0 transition-all duration-500">
                    <AvatarImage src={user?.image ?? ''} />
                    <AvatarFallback className="rounded-[2.5rem] text-2xl">{user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-2xl text-white shadow-lg">
                    <ShieldCheck size={20} />
                  </div>
                </div>
                
                <div className="flex-1 text-center md:text-left space-y-3">
                  <Badge variant="secondary" className="bg-primary/10 text-primary px-3 py-1 font-bold">VERIFIED ARCHITECT</Badge>
                  <h1 className="text-5xl font-serif font-semibold tracking-tight leading-none">{user?.name || 'Syncing...'}</h1>
                  <p className="text-lg text-muted-foreground font-medium">{user?.email}</p>
                </div>

                <Button onClick={openEdit} className="rounded-2xl px-8 h-12 gap-2 shadow-lg shadow-primary/20">
                  <Edit size={18} />
                  Update Identity
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Stats & Bio */}
              <div className="lg:col-span-4 space-y-8">
                <Card className="p-8 border-border/60 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-6">Manifesto</span>
                  <div className="space-y-4 border-l-2 border-primary/20 pl-6 py-1">
                    {user?.quote?.map((q, i) => (
                      <p key={i} className="text-sm font-serif italic leading-relaxed text-foreground/80">{q}</p>
                    )) || <p className="text-sm text-muted-foreground italic">No manifesto recorded.</p>}
                  </div>
                </Card>

                <Card className="p-8 border-border/60 shadow-sm space-y-8">
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block">Neural Protocols</span>
                    <div className="flex flex-wrap gap-2">
                      {user?.languages?.map(l => <Badge key={l} variant="outline" className="rounded-lg px-3 py-1 border-primary/20 text-primary bg-primary/5">{l}</Badge>)}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block">Registry Data</span>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm font-medium"><MapPin size={16} className="text-primary" /> {user?.location || 'Unknown Node'}</div>
                      <div className="flex items-center gap-3 text-sm font-medium"><Github size={16} className="text-primary" /> Source Control</div>
                      <div className="flex items-center gap-3 text-sm font-medium"><Linkedin size={16} className="text-primary" /> Professional Network</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Side: Activity & Performance */}
              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Global Rank', value: '#2,841', icon: <Globe size={14} /> },
                    { label: 'Network Points', value: '14.2k', icon: <Zap size={14} /> },
                    { label: 'Solve Rate', value: '94.2%', icon: <Target size={14} /> },
                  ].map(stat => (
                    <Card key={stat.label} className="p-6 border-border/60 shadow-sm group hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2 text-primary">
                        {stat.icon}
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                      </div>
                      <p className="text-3xl font-bold tracking-tighter group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
                    </Card>
                  ))}
                </div>

                <Card className="p-8 border-border/60 shadow-sm">
                   <div className="flex items-center justify-between mb-8">
                     <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Synchronized Submissions</span>
                     <div className="flex gap-4">
                       <button className="text-xs font-bold text-primary pb-1 border-b-2 border-primary">Registry</button>
                       <button className="text-xs font-bold text-muted-foreground">Archive</button>
                     </div>
                   </div>

                   <div className="space-y-3">
                     {[1, 2, 3, 4].map(i => (
                       <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-all border border-transparent hover:border-border/60 group">
                         <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center text-emerald-500 font-bold text-xs">OK</div>
                            <div className="flex flex-col">
                               <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Algorithmic Node #{1024 + i}</span>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hash Map Optimization // 2h ago</span>
                            </div>
                         </div>
                         <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                       </div>
                     ))}
                   </div>

                   <Button variant="ghost" className="w-full mt-8 rounded-xl font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
                     Load Extended Logs
                   </Button>
                </Card>
              </div>

            </div>
          </div>
        </main>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl border-border/60 shadow-2xl bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Modify Identity Registry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Architect Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Location Node</Label>
                <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Protocols (Langs)</Label>
                <Input value={form.languages} onChange={e => setForm({...form, languages: e.target.value})} className="rounded-xl h-11" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Manifesto (Bio)</Label>
                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="w-full h-[184px] bg-background border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl px-8 font-bold text-xs uppercase tracking-widest">Abort</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl px-10 h-11 shadow-lg shadow-primary/20">{saving ? 'Syncing...' : 'Commit Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
