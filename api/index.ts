import express from "express";
import { createClient } from '@supabase/supabase-js';

// 直接定义类型以避免路径引用问题
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface HistoryItem {
  id: string;
  timestamp: number;
  [key: string]: any;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase Init Error:", e);
  }
}

const app = express();
app.use(express.json({ limit: '50mb' }));

// 内存回退（注意：Serverless 环境下内存是短暂的）
const memoryUsers: User[] = [
  { id: "1", email: "iceman9226@gmail.com", name: "Admin (IceMan)", role: "admin" },
];
let memoryHistoryDb: any[] = [];

// 辅助函数：统一错误响应
const sendError = (res: any, err: any, context: string) => {
  console.error(`[${context}] Error:`, err);
  res.status(500).json({
    error: err.message || "Internal Server Error",
    context,
    details: err.details || err.hint || null
  });
};

// --- API Routes ---

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabase: !!supabase });
});

// 登录/注册
app.post("/api/login", async (req: any, res: any) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
        
      if (error) throw error;

      if (user) {
        return res.json({ success: true, user });
      } else {
        // 自动注册 - 手动生成 ID 以满足数据库非空约束
        const newUser = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          email,
          name: name || email.split('@')[0],
          role: email === 'iceman9226@gmail.com' ? 'admin' : 'user',
        };
        
        const { data, error: insertError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();
          
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
  } catch (err) {
    sendError(res, err, "Login/Register");
  }
});

// 获取历史
app.get("/api/history", async (req: any, res: any) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (supabase) {
      const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (userError) throw userError;
      if (!user) return res.status(401).json({ error: "User not found" });

      let query = supabase.from('history').select('*').order('timestamp', { ascending: false });
      if (user.role !== 'admin') {
        query = query.eq('userId', userId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return res.json(data);
    } else {
      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const data = user.role === "admin" ? memoryHistoryDb : memoryHistoryDb.filter((h) => h.userId === userId);
      return res.json([...data].sort((a, b) => b.timestamp - a.timestamp));
    }
  } catch (err) {
    sendError(res, err, "Get History");
  }
});

// 添加历史
app.post("/api/history", async (req: any, res: any) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (supabase) {
      const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (userError) throw userError;
      if (!user) return res.status(401).json({ error: "User not found" });

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
    } else {
      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const newItem = { ...req.body, userId: user.id, userName: user.name };
      memoryHistoryDb.push(newItem);
      return res.json({ success: true, item: newItem });
    }
  } catch (err) {
    sendError(res, err, "Add History");
  }
});

// 删除历史
app.delete("/api/history/:id", async (req: any, res: any) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (supabase) {
      const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (userError) throw userError;
      if (!user) return res.status(401).json({ error: "User not found" });

      const { data: item, error: itemError } = await supabase.from('history').select('*').eq('id', id).maybeSingle();
      if (itemError) throw itemError;
      if (!item) return res.status(404).json({ error: "Item not found" });

      if (user.role === "admin" || item.userId === user.id) {
        const { error } = await supabase.from('history').delete().eq('id', id);
        if (error) throw error;
        return res.json({ success: true });
      }
      return res.status(403).json({ error: "Forbidden" });
    } else {
      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const index = memoryHistoryDb.findIndex(h => h.id === id);
      if (index === -1) return res.status(404).json({ error: "Not found" });
      if (user.role === "admin" || memoryHistoryDb[index].userId === userId) {
        memoryHistoryDb.splice(index, 1);
        return res.json({ success: true });
      }
      return res.status(403).json({ error: "Forbidden" });
    }
  } catch (err) {
    sendError(res, err, "Delete History");
  }
});

export default app;
