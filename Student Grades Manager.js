const fs = require('fs').promises;
const path = require('path');

const FILE_PATH = path.join(__dirname, 'data', 'grades.json');

async function readGrades() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(FILE_PATH, '[]', 'utf8');
      return [];
    }
    throw err;
  }
}

async function saveGrades(grades) {
  await fs.writeFile(FILE_PATH, JSON.stringify(grades, null, 2), 'utf8');
}

async function addGrade(name, subject, grade) {
  if (!name || !subject || grade === undefined) throw new Error('Missing fields');
  grade = Number(grade);
  if (isNaN(grade) || grade < 0 || grade > 100) throw new Error('Grade 0‑100');

  const grades = await readGrades();
  const newGrade = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    subject: subject.trim(),
    grade
  };
  grades.push(newGrade);
  await saveGrades(grades);
  return newGrade;
}

async function deleteGrade(criteria) {
  const { id, name } = criteria;
  if (!id && !name) throw new Error('Provide --id or --name');

  const grades = await readGrades();
  let filtered;
  if (id) {
    filtered = grades.filter(g => g.id !== id);
  } else {
    const lower = name.trim().toLowerCase();
    filtered = grades.filter(g => g.name.toLowerCase() !== lower);
  }
  const count = grades.length - filtered.length;
  if (count === 0) throw new Error('No matching record');
  await saveGrades(filtered);
  return count;
}

async function updateGrade(id, updates) {
  if (!id) throw new Error('ID required');
  if (!updates.subject && updates.grade === undefined) throw new Error('Provide subject or grade');

  const grades = await readGrades();
  const idx = grades.findIndex(g => g.id === id);
  if (idx === -1) throw new Error(`ID ${id} not found`);

  const rec = grades[idx];
  if (updates.subject) rec.subject = updates.subject.trim();
  if (updates.grade !== undefined) {
    const g = Number(updates.grade);
    if (isNaN(g) || g < 0 || g > 100) throw new Error('Grade 0‑100');
    rec.grade = g;
  }
  await saveGrades(grades);
  return rec;
}

async function listGrades() {
  const grades = await readGrades();
  if (grades.length === 0) console.log('📭 No grades.');
  else {
    console.log('📚 All grades:');
    grades.forEach(g => console.log(`  ${g.id} | ${g.name} | ${g.subject} | ${g.grade}`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  try {
    switch (cmd) {
      case 'add': {
        const [name, subject, grade] = args.slice(1);
        if (!name || !subject || grade === undefined) {
          console.error('Usage: node main.js add <name> <subject> <grade>');
          process.exit(1);
        }
        const rec = await addGrade(name, subject, grade);
        console.log('✅ Added:', rec);
        break;
      }
      case 'read': {
        await listGrades();
        break;
      }
      case 'delete': {
        const idIdx = args.indexOf('--id');
        const nameIdx = args.indexOf('--name');
        let criteria = {};
        if (idIdx !== -1 && args[idIdx + 1]) {
          criteria.id = args[idIdx + 1];
        } else if (nameIdx !== -1 && args[nameIdx + 1]) {
          criteria.name = args[nameIdx + 1];
        } else {
          console.error('Usage: node main.js delete --id <id> or --name <name>');
          process.exit(1);
        }
        const count = await deleteGrade(criteria);
        console.log(`🗑️ Deleted ${count} record(s).`);
        break;
      }
      case 'update': {
        const idIdx = args.indexOf('--id');
        if (idIdx === -1 || !args[idIdx + 1]) {
          console.error('Usage: node main.js update --id <id> [--subject <subject>] [--grade <grade>]');
          process.exit(1);
        }
        const id = args[idIdx + 1];
        const updates = {};
        const subIdx = args.indexOf('--subject');
        if (subIdx !== -1 && args[subIdx + 1]) updates.subject = args[subIdx + 1];
        const grdIdx = args.indexOf('--grade');
        if (grdIdx !== -1 && args[grdIdx + 1]) updates.grade = args[grdIdx + 1];
        if (Object.keys(updates).length === 0) {
          console.error('Provide at least one field to update: --subject or --grade');
          process.exit(1);
        }
        const updated = await updateGrade(id, updates);
        console.log('✏️ Updated:', updated);
        break;
      }
      default:
        console.log(`
Available commands:
  add <name> <subject> <grade>    Add a new grade record
  read                            Display all grades
  delete --id <id>                Delete by ID
  delete --name <name>            Delete all records with given name
  update --id <id> [--subject <s>] [--grade <g>]  Update fields
        `);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();