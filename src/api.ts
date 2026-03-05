import express from "express";
import { HistoryItem, User } from "../types";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 安全初始化 Supabase
let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    // 简单的 URL 合法性检查
    new URL(supabaseUrl);
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase initialized successfully");
  } catch (e) {
    console.error("Supabase initialization failed: Invalid URL", supabaseUrl);
  }
}

const memoryUsers: User[] = [
  { id: "1", email: "iceman9226@gmail.com", name: "Admin (IceMan)", role: "admin" },
];
let memoryHistoryDb: (HistoryItem & { userId: string; userName: string })[] = [];

const app = express();
app.use(express.json({ limit: '50mb' }));

// 全局错误处理中间件
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- API Routes ---

app.post("/api/login", asyncHandler(async (req: any, res: any) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  if (supabase) {
    let { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (error) throw error;

    if (user) {
      return res.json({ success: true, user });
    } else {
      const newUser = {
        id: Date.now().toString(),
        email,
        name: name || email.split('@')[0],
        role: email === 'iceman9226@gmail.com' ? 'admin' : 'user',
      };
      const { data, error: insertError } = await supabase.from('users').insert([newUser]).select().single();
      if (insertError) throw insertError;
      return res.json({ success: true, user: data });
    }
  } else {
    const user = memoryUsers.find((u) => u.email === email);
    if (user) return res.json({ success: true, user });
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name: name || email.split('@')[0],
      role: email === 'iceman9226@gmail.com' ? 'admin' : 'user',
    };
    memoryUsers.push(newUser);
    return res.json({ success: true, user: newUser });
  }
}));

app.get("/api/history", asyncHandler(async (req: any, res: any) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized: Missing User ID" });

  if (supabase) {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!user) return res.status(401).json({ error: "Unauthorized: User not found in database" });

    let query = supabase.from('history').select('*').order('timestamp', { ascending: false });
    if (user.role !== 'admin') query = query.eq('userId', userId);
    
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data);
  } else {
    const user = memoryUsers.find((u) => u.id === userId);
    if (!user) return res.status(401).json({ error: "Unauthorized: User session expired or server restarted" });
    const data = user.role === "admin" ? memoryHistoryDb : memoryHistoryDb.filter((h) => h.userId === userId);
    return res.json([...data].sort((a, b) => b.timestamp - a.timestamp));
  }
}));

app.post("/api/history", asyncHandler(async (req: any, res: any) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized: Missing User ID" });

  if (supabase) {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!user) return res.status(401).json({ error: "Unauthorized: User not found in database" });

    const newItem = { ...req.body, userId: user.id, userName: user.name };
    const { data, error } = await supabase.from('history').insert([newItem]).select().single();
    if (error) throw error;
    return res.json({ success: true, item: data });
  } else {
    const user = memoryUsers.find((u) => u.id === userId);
    if (!user) return res.status(401).json({ error: "Unauthorized: User session expired or server restarted" });
    const newItem = { ...req.body, userId: user.id, userName: user.name };
    memoryHistoryDb.push(newItem);
    return res.json({ success: true, item: newItem });
  }
}));

app.delete("/api/history/:id", asyncHandler(async (req: any, res: any) => {
  const userId = req.headers['x-user-id'] as string;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: "Unauthorized: Missing User ID" });

  if (supabase) {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!user) return res.status(401).json({ error: "Unauthorized: User not found in database" });

    const { data: item } = await supabase.from('history').select('*').eq('id', id).maybeSingle();
    if (!item) return res.status(404).json({ error: "Not found" });

    if (user.role === "admin" || item.userId === user.id) {
      const { error } = await supabase.from('history').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }
    return res.status(403).json({ error: "Forbidden" });
  } else {
    const user = memoryUsers.find((u) => u.id === userId);
    if (!user) return res.status(401).json({ error: "Unauthorized: User session expired or server restarted" });
    const itemIndex = memoryHistoryDb.findIndex((h) => h.id === id);
    if (itemIndex === -1) return res.status(404).json({ error: "Not found" });
    const item = memoryHistoryDb[itemIndex];
    if (user.role === "admin" || item.userId === user.id) {
      memoryHistoryDb.splice(itemIndex, 1);
      return res.json({ success: true });
    }
    return res.status(403).json({ error: "Forbidden" });
  }
}));

// 统一错误处理
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    details: err.message,
    supabaseError: err.details || err.hint
  });
});

export default app;
