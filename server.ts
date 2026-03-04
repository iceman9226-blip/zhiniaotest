import express from "express";
import { createServer as createViteServer } from "vite";
import { HistoryItem, User } from "./src/types";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Mock Database (Fallback if Supabase is not configured)
const memoryUsers: User[] = [
  { id: "1", email: "iceman9226@gmail.com", name: "Admin (IceMan)", role: "admin" },
  { id: "2", email: "user1@example.com", name: "Designer A", role: "user" },
  { id: "3", email: "user2@example.com", name: "Designer B", role: "user" },
];

let memoryHistoryDb: (HistoryItem & { userId: string; userName: string })[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

  // --- API Routes ---

  // Login
  app.post("/api/login", async (req, res) => {
    const { email, name } = req.body;
    
    if (supabase) {
      try {
        let { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
          
        if (error) {
          throw error;
        }

        if (user) {
          res.json({ success: true, user });
        } else {
          // Auto-register new user
          const newUser = {
            id: Date.now().toString(),
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
          res.json({ success: true, user: data });
        }
      } catch (err: any) {
        console.error("Supabase login error:", err);
        res.status(500).json({ error: err.message });
      }
    } else {
      // Fallback to memory
      const user = memoryUsers.find((u) => u.email === email);
      if (user) {
        res.json({ success: true, user });
      } else {
        const newUser: User = {
          id: Date.now().toString(),
          email,
          name: name || email.split('@')[0],
          role: email === 'iceman9226@gmail.com' ? 'admin' : 'user',
        };
        memoryUsers.push(newUser);
        res.json({ success: true, user: newUser });
      }
    }
  });

  // Get History
  app.get("/api/history", async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    
    if (supabase) {
      try {
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (!user) return res.status(401).json({ error: "Unauthorized" });

        let query = supabase.from('history').select('*').order('timestamp', { ascending: false });
        if (user.role !== 'admin') {
          query = query.eq('userId', userId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    } else {
      // Fallback
      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      if (user.role === "admin") {
        res.json(memoryHistoryDb.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        res.json(memoryHistoryDb.filter((h) => h.userId === userId).sort((a, b) => b.timestamp - a.timestamp));
      }
    }
  });

  // Add History
  app.post("/api/history", async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    
    if (supabase) {
      try {
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const newItem = {
          ...req.body,
          userId: user.id,
          userName: user.name,
        };
        
        const { data, error } = await supabase.from('history').insert([newItem]).select().single();
        if (error) throw error;
        res.json({ success: true, item: data });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    } else {
      // Fallback
      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const newItem = {
        ...req.body,
        userId: user.id,
        userName: user.name,
      };
      memoryHistoryDb.push(newItem);
      res.json({ success: true, item: newItem });
    }
  });

  // Delete History
  app.delete("/api/history/:id", async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    
    if (supabase) {
      try {
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const { data: item } = await supabase.from('history').select('*').eq('id', id).maybeSingle();
        if (!item) return res.status(404).json({ error: "Not found" });

        if (user.role === "admin" || item.userId === user.id) {
          const { error } = await supabase.from('history').delete().eq('id', id);
          if (error) throw error;
          res.json({ success: true });
        } else {
          res.status(403).json({ error: "Forbidden" });
        }
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    } else {
      // Fallback
      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const itemIndex = memoryHistoryDb.findIndex((h) => h.id === id);
      if (itemIndex === -1) return res.status(404).json({ error: "Not found" });

      const item = memoryHistoryDb[itemIndex];
      if (user.role === "admin" || item.userId === user.id) {
        memoryHistoryDb.splice(itemIndex, 1);
        res.json({ success: true });
      } else {
        res.status(403).json({ error: "Forbidden" });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
