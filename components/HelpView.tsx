import React from "react";
import {
  BookOpen,
  Cpu,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const HelpView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          帮助与文档
        </h1>
        <p className="text-lg text-slate-500">
          了解 B端产品易用性度量标准及 AI 分析原理
        </p>
      </div>

      {/* Standard Explanation */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#FF8839]/10 text-[#FF8839] rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            B端产品易用性度量标准
          </h2>
        </div>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
          <p>
            本系统基于业界权威的“B端产品易用性度量标准”（Ease of Use Metric for
            Cloud
            Product），结合尼尔森十大可用性原则，从六个核心维度对高保真原型进行深度评估：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 易操作性
                (Operability)
              </h3>
              <p className="text-sm mt-2">
                评估用户完成任务的便捷程度，包括操作路径长度、交互反馈及容错机制。
              </p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 易学性
                (Learnability)
              </h3>
              <p className="text-sm mt-2">
                评估新用户上手难度，包括界面符合用户心智模型的程度及引导设计的有效性。
              </p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 清晰性
                (Clarity)
              </h3>
              <p className="text-sm mt-2">
                评估信息传达的准确性，包括文案表述、视觉层级及信息密度的合理性。
              </p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 一致性
                (Consistency)
              </h3>
              <p className="text-sm mt-2">
                评估界面元素、交互模式及视觉风格在全局的统一性。
              </p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 效率
                (Efficiency)
              </h3>
              <p className="text-sm mt-2">
                评估熟练用户的使用效率，包括快捷键、批量操作及自动化流程的支持。
              </p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 满意度
                (Satisfaction)
              </h3>
              <p className="text-sm mt-2">
                评估用户在使用过程中的主观感受，包括视觉美感及情感化设计。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Process */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Cpu className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">AI 分析原理</h2>
        </div>
        <div className="space-y-6 text-slate-600">
          <p>
            我们的系统采用先进的多模态大语言模型（Gemini Pro
            Vision），通过以下步骤对您的设计进行深度解析：
          </p>
          <ol className="relative border-l border-slate-200 ml-3 space-y-6">
            <li className="pl-6 relative">
              <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
              <h3 className="font-bold text-slate-900">
                1. 视觉解析与结构重构
              </h3>
              <p className="text-sm mt-1">
                AI
                扫描上传的原型图，识别界面元素（按钮、表单、导航等），重构页面的视觉层级和信息架构。
              </p>
            </li>
            <li className="pl-6 relative">
              <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
              <h3 className="font-bold text-slate-900">2. 启发式规则匹配</h3>
              <p className="text-sm mt-1">
                将识别出的界面特征与内置的
                B端易用性标准知识库进行比对，寻找潜在的可用性问题或优秀设计模式。
              </p>
            </li>
            <li className="pl-6 relative">
              <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
              <h3 className="font-bold text-slate-900">
                3. 维度打分与雷达图生成
              </h3>
              <p className="text-sm mt-1">
                基于匹配结果，对六个核心维度进行量化打分（0-100分），并计算整体易用性得分，生成直观的雷达图。
              </p>
            </li>
            <li className="pl-6 relative">
              <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
              <h3 className="font-bold text-slate-900">4. 改进建议生成</h3>
              <p className="text-sm mt-1">
                针对发现的可用性问题，提供具体、可执行的优化建议，帮助设计师快速迭代方案。
              </p>
            </li>
            <li className="pl-6 relative">
              <div className="absolute w-3 h-3 bg-[#FF8839] rounded-full -left-[6.5px] top-1.5 ring-4 ring-white"></div>
              <h3 className="font-bold text-slate-900">5. Nielsen 专家对话 </h3>
              <p className="text-sm mt-1">
                在分析结果页，您可以唤起 <strong>Jakob Nielsen 专家助手</strong>。AI 会扮演这位世界著名的可用性专家，结合您的设计图和初步分析报告，通过多轮对话为您提供更深入、更个性化的 10 大可用性原则指导。
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">常见问题 (FAQ)</h2>
        </div>
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              支持上传哪些格式的文件？
            </h3>
            <p className="text-slate-600 text-sm mt-2 ml-7">
              目前支持上传 JPG、PNG、WEBP
              格式的高保真原型图或设计稿截图。建议上传清晰度较高的图片以获得更准确的分析结果。
            </p>
          </div>
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              分析结果的准确度如何？
            </h3>
            <p className="text-slate-600 text-sm mt-2 ml-7">
              AI
              分析基于预训练的通用设计规范和启发式原则，能够发现大部分常见的可用性问题。但对于特定业务场景的复杂逻辑，建议结合真实用户测试（Usability
              Testing）进行综合评估。
            </p>
          </div>
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              我的设计稿数据安全吗？
            </h3>
            <p className="text-slate-600 text-sm mt-2 ml-7">
              访客模式下，分析历史仅保存在您的本地浏览器中。登录后，数据将同步至云端。我们严格遵守隐私保护协议，不会将您的设计稿用于模型训练或分享给第三方。
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              如何提高 AI 分析的质量？
            </h3>
            <p className="text-slate-600 text-sm mt-2 ml-7">
              上传包含完整上下文的页面截图（避免只截取局部组件），并在图片中保留清晰的文本和交互状态（如
              Hover、Active 状态），有助于 AI 更好地理解您的设计意图。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HelpView;
