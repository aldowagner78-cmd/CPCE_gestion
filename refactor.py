import sys

path = r'c:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\src\app\audits\requests\new\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Asignar auditor is around 1806-1835
# Comunicacion + Adjuntos is around 1922-2148
# Let's find the exact indices
start_auditor = -1
end_auditor = -1

for i, line in enumerate(lines):
    if '{/* ═  ASIGNACIÓN DE AUDITOR' in line:
        start_auditor = i - 1
    if start_auditor != -1 and i > start_auditor + 10 and ')}' in line and lines[i+1].strip() == '':
        if 'Asignar auditor' in ''.join(lines[start_auditor:i+1]):
             end_auditor = i
             break

start_comm = -1
end_comm = -1

for i, line in enumerate(lines):
    if '{/* Comunicación — dual column chat */}' in line:
        start_comm = i
    if start_comm != -1 and i > start_comm + 100 and '{/* ══════════════════════════════════════ */}' in line and '{/* ═  VALIDACIONES INLINE' in lines[i+1]:
        end_comm = i - 1
        break

if start_auditor != -1 and end_auditor != -1 and start_comm != -1 and end_comm != -1:
    auditor_block = lines[start_auditor:end_auditor+1]
    comm_block = lines[start_comm:end_comm+1]
    
    # Remove them from original positions (reverse order to keep indices valid)
    del lines[start_comm:end_comm+1]
    del lines[start_auditor:end_auditor+1]
    
    # Now find where to insert them in Step 3
    # Step 3 starts around 2482
    # We want to insert them before the 'botones' section of step 3
    # Look for '{/* ═  BOTONES: PREVISUALIZAR + ENVIAR   ═ */}' or similar. Actually wait, Step 3 has its own buttons:
    # '<div className="flex items-center gap-3 pt-2 border-t">' within tracking step 3
    
    insert_idx = -1
    for i, line in enumerate(lines):
        if 'Volver a Editar' in line and '<ArrowLeft' in lines[i-1]:
            # This is inside the Step 3 buttons
            insert_idx = i - 4 # Go back to the <div className="flex items-center gap-3 pt-2 border-t">
            break
            
    if insert_idx != -1:
        # Also let's add the AI Priority to the summary array in Step 3.
        # Find the summary grid: '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">'
        # Let's insert the priority block inside it
        priority_html = '''                        {aiPriorityResult && (
                            <div className="bg-white rounded-lg border p-3">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Prioridad Sugerida</span>
                                <p className={`font-medium ${aiPriorityResult.level === 'alta' ? 'text-red-700' : aiPriorityResult.level === 'media' ? 'text-amber-700' : 'text-green-700'}`}>
                                    {aiPriorityResult.level.toUpperCase()}
                                </p>
                            </div>
                        )}\n'''
        
        # We also need to remove 'Adjuntos summary' from step 3 since the actual Adjuntos control is moved.
        # It looks like: '{files.length > 0 && (\n                        <div className="bg-white rounded-lg border p-3">\n                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Adjuntos'
        
        # remove adjuntos summary
        start_adj_summary = -1
        end_adj_summary = -1
        for i, line in enumerate(lines):
            if '{files.length > 0 && (' in line and 'Adjuntos (' in lines[i+1]:
                start_adj_summary = i
            if start_adj_summary != -1 and i > start_adj_summary and '</div>' in line and ')}' in lines[i+1]:
                end_adj_summary = i + 1
                break
                
        if start_adj_summary != -1:
            del lines[start_adj_summary:end_adj_summary+1]
            insert_idx -= (end_adj_summary - start_adj_summary + 1)
            
        # insert blocks
        # First communication, then auditor? Or Auditor then communication?
        lines.insert(insert_idx, ''.join(auditor_block) + '\n' + ''.join(comm_block) + '\n')
        
        # Insert Priority in the grid
        for i, line in enumerate(lines):
            if '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">' in line:
                lines.insert(i + 1, priority_html)
                break
                
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print('SUCCESS')
    else:
        print('FAILED to find insert index')
else:
    print('FAILED', start_auditor, end_auditor, start_comm, end_comm)
