import "dotenv/config";
import express from "express";
import { HistoryItem, User } from "../types";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 安全初始化 Supabase
let supabase: any = null;
console.log("Initializing Supabase...");

const initSupabase = async () => {
  if (supabaseUrl && supabaseKey) {
    try {
      new URL(supabaseUrl);
      const client = createClient(supabaseUrl, supabaseKey);
      
      // 测试连接
      const { error } = await client.from('users').select('count', { count: 'exact', head: true }).limit(1);
      if (error) {
        console.error("Supabase connection test failed:", error.message);
        console.log("Falling back to memory storage due to connection error");
        supabase = null;
      } else {
        supabase = client;
        console.log("Supabase client created and connection verified");
      }
    } catch (e) {
      console.error("Supabase initialization failed:", e);
      supabase = null;
    }
  } else {
    console.log("Supabase credentials missing, falling back to memory storage");
    supabase = null;
  }
};

// 立即尝试初始化，但不阻塞启动
initSupabase();

const memoryUsers: User[] = [
  { id: "1", email: "iceman9226@gmail.com", name: "Admin (IceMan)", role: "admin" },
];
let memoryHistoryDb: (HistoryItem & { userId: string; userName: string })[] = [];

const app = express();
app.use(express.json({ limit: '100mb' }));

// 全局错误处理中间件
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- API Routes ---

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabase: !!supabase,
    env: {
      url: !!process.env.SUPABASE_URL,
      key: !!process.env.SUPABASE_ANON_KEY
    }
  });
});

app.post("/api/login", asyncHandler(async (req: any, res: any) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  if (supabase) {
    try {
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
    } catch (dbError: any) {
      console.error("Supabase Login Error, falling back to memory:", dbError.message);
      // Fallback to memory if DB fails
      return handleMemoryLogin(email, name, res);
    }
  } else {
    return handleMemoryLogin(email, name, res);
  }
}));

function handleMemoryLogin(email: string, name: string, res: any) {
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

app.get("/api/history", asyncHandler(async (req: any, res: any) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized: Missing User ID" });

  if (supabase) {
    try {
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (!user) return res.status(401).json({ error: "Unauthorized: User not found in database" });

      let query = supabase.from('history').select('*').order('timestamp', { ascending: false });
      if (user.role !== 'admin') query = query.eq('userId', userId);
      
      const { data, error } = await query;
      if (error) throw error;
      return res.json(data);
    } catch (dbError: any) {
      console.error("Supabase Get History Error, falling back to memory:", dbError.message);
      return handleMemoryGetHistory(userId, res);
    }
  } else {
    return handleMemoryGetHistory(userId, res);
  }
}));

function getOrCreateMemoryUser(userId: string): { id: string; email: string; name: string; role: string } {
  let user = memoryUsers.find((u) => u.id === userId);
  if (!user) {
    const isIceMan = userId === "1" || userId.includes("ice") || userId.includes("9226");
    user = {
      id: userId,
      email: isIceMan ? "iceman9226@gmail.com" : `${userId}@example.com`,
      name: isIceMan ? "Admin (IceMan)" : `User_${userId.slice(0, 4)}`,
      role: isIceMan ? "admin" : "user"
    };
    memoryUsers.push(user);
    console.log(`Created ephemeral memory user for id: ${userId}`);
  }
  return user;
}

function handleMemoryGetHistory(userId: string, res: any) {
  const user = getOrCreateMemoryUser(userId);
  const data = user.role === "admin" ? memoryHistoryDb : memoryHistoryDb.filter((h) => h.userId === userId);
  return res.json([...data].sort((a, b) => b.timestamp - a.timestamp));
}

app.post("/api/history", asyncHandler(async (req: any, res: any) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized: Missing User ID" });

  if (supabase) {
    try {
      const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (userError) throw userError;
      if (!user) return res.status(401).json({ error: "Unauthorized: User not found in database" });

      const { id, previewUrl, ...rest } = req.body;
      const newItem = { 
        id: id || Date.now().toString(),
        previewUrl: previewUrl,
        ...rest, 
        userId: user.id, 
        userName: user.name 
      };

      const { data, error } = await supabase.from('history').insert([newItem]).select().single();
      if (error) throw error;
      return res.json({ success: true, item: data });
    } catch (dbError: any) {
      console.error("Supabase Post History Error, falling back to memory:", dbError.message);
      return handleMemoryPostHistory(userId, req.body, res);
    }
  } else {
    return handleMemoryPostHistory(userId, req.body, res);
  }
}));

function handleMemoryPostHistory(userId: string, body: any, res: any) {
  const user = getOrCreateMemoryUser(userId);
  const newItem = { ...body, userId: user.id, userName: user.name };
  memoryHistoryDb.push(newItem);
  return res.json({ success: true, item: newItem });
}

app.delete("/api/history/:id", asyncHandler(async (req: any, res: any) => {
  const userId = req.headers['x-user-id'] as string;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: "Unauthorized: Missing User ID" });

  if (supabase) {
    try {
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
    } catch (dbError: any) {
      console.error("Supabase Delete History Error, falling back to memory:", dbError.message);
      return handleMemoryDeleteHistory(userId, id, res);
    }
  } else {
    return handleMemoryDeleteHistory(userId, id, res);
  }
}));

function handleMemoryDeleteHistory(userId: string, id: string, res: any) {
  const user = getOrCreateMemoryUser(userId);
  const itemIndex = memoryHistoryDb.findIndex((h) => h.id === id);
  if (itemIndex === -1) return res.status(404).json({ error: "Not found" });
  const item = memoryHistoryDb[itemIndex];
  if (user.role === "admin" || item.userId === user.id) {
    memoryHistoryDb.splice(itemIndex, 1);
    return res.json({ success: true });
  }
  return res.status(403).json({ error: "Forbidden" });
}

// 统一错误处理
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(500).json({ 
    error: err.message || "Internal Server Error", 
    details: err.stack,
    supabaseError: err.details || err.hint
  });
});

export default app;
