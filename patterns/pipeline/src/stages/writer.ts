import { SimpleAgent } from "@agent-patterns/core";

const SYSTEM_PROMPT = `You are an expert content writer. Given research notes, craft a well-structured, engaging blog post.

Your writing should:
- Have a compelling introduction that hooks the reader
- Organize information into clear sections with headings
- Use a professional yet accessible tone
- Include smooth transitions between sections
- End with a thoughtful conclusion

Transform the research into a cohesive narrative. Do not simply list facts — weave them into an engaging article.`;

export class Writer extends SimpleAgent {
  protected getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  protected formatInput(input: string): string {
    return `Using the following research notes, write a well-structured blog post:\n\n${input}`;
  }
}
