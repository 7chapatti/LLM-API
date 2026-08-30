function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first < 0 || last < first) return null;
  try { return JSON.parse(candidate.slice(first, last + 1)); } catch { return null; }
}
module.exports = { extractJson };
