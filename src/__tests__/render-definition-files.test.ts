import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration, McpToolResponse } from '../types/index.js';
import { registerRenderDefinitionTool, RenderDefinitionInputSchema } from '../tools/render-definition.js';

// Real filesystem; only the remote renderer is stubbed.
describe('render_definition file acceptance', () => {
  let root: string;
  let outside: string;
  let handler: (args: unknown) => Promise<McpToolResponse>;
  let previousRoot: string | undefined;
  const get = vi.fn();
  const markdown = 'model = "gpt-5.3"\n# Résumé 🐢\n';
  const metadata = {
    target: 'codex',
    selectedModel: 'gpt-5.3',
    promptHash: `sha256:${createHash('sha256').update(markdown).digest('hex')}`,
    warnings: [{ field: 'model', reason: 'Fixture fallback warning', level: 'warn' }],
    metadata: { fixture: 'diagnostics' },
  };
  const request = { type: 'agent', name: 'fixture', version: '1.0.0', target: 'codex', model: 'gpt-5.3' };

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'f21-root-')));
    outside = await realpath(await mkdtemp(join(tmpdir(), 'f21-outside-')));
    previousRoot = process.env['OUTPUT_BASE_DIR'];
    process.env['OUTPUT_BASE_DIR'] = root;
    get.mockReset().mockImplementation((_type, _name, _version, options) => Promise.resolve({
      markdown, ...metadata, renderProfile: options.renderProfile,
    }));
    const server = { tool: (_name: string, _description: string, _schema: unknown, fn: typeof handler): void => { handler = fn; } };
    registerRenderDefinitionTool(server as unknown as McpServerToolRegistration, { render: { get } } as unknown as RegistryClient);
  });

  afterEach(async () => {
    if (previousRoot === undefined) delete process.env['OUTPUT_BASE_DIR'];
    else process.env['OUTPUT_BASE_DIR'] = previousRoot;
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  function payload(response: McpToolResponse): Record<string, unknown> {
    expect(response.isError).toBeUndefined();
    return JSON.parse(response.content[0]?.text ?? '') as Record<string, unknown>;
  }

  it.each([undefined, 'core', 'uluops-full'] as const)('matches inline bytes and metadata for profile %s', async (render_profile) => {
    const args = { ...request, render_profile };
    const inline = payload(await handler(args));
    const output_path = join(root, 'nested', 'render.toml');
    const file = payload(await handler({ ...args, output_path }));
    const { markdown: content, ...expectedMetadata } = inline;
    expect(file).toEqual({ ...expectedMetadata, success: true, output_path, bytes: Buffer.byteLength(markdown, 'utf-8') });
    expect(await readFile(output_path, 'utf-8')).toBe(content);
    expect(get.mock.calls[0]).toEqual(get.mock.calls[1]);
    expect(file.renderProfile).toBe(render_profile ?? 'uluops-full');
    const replacement = payload(await handler({ ...args, output_path, overwrite: true }));
    expect(replacement).toEqual(file);
    expect(await readFile(output_path, 'utf-8')).toBe(content);
    expect(get.mock.calls[2]).toEqual(get.mock.calls[0]);
  });

  it('refuses outside-root, prefix-sibling and traversal without rendering', async () => {
    for (const output_path of [join(outside, 'escape.toml'), `${root}-sibling/escape.toml`, join(root, '..', 'escape.toml')]) {
      const result = await handler({ ...request, output_path });
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('output_path must resolve within');
    }
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses file symlinks, including dangling links, with overwrite enabled', async () => {
    const original = join(outside, 'original.toml');
    await writeFile(original, 'preserved');
    for (const [name, target] of [['existing', original], ['dangling', join(outside, 'missing.toml')]] as const) {
      const output_path = join(root, `${name}.toml`);
      await symlink(target, output_path);
      expect((await handler({ ...request, output_path, overwrite: true })).isError).toBe(true);
    }
    expect(await readFile(original, 'utf-8')).toBe('preserved');
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses ancestor symlinks pointing outside or inside the root', async () => {
    await mkdir(join(root, 'inside'));
    for (const [name, target] of [['escape', outside], ['alias', join(root, 'inside')]] as const) {
      const directory = join(root, name);
      await symlink(target, directory);
      const result = await handler({ ...request, output_path: join(directory, 'render.toml'), overwrite: true });
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('symbolic link in its directory path');
    }
    expect(get).not.toHaveBeenCalled();
  });

  it('preserves existing bytes unless overwrite is explicit', async () => {
    const output_path = join(root, 'existing.toml');
    await writeFile(output_path, 'preserved');
    const denied = await handler({ ...request, output_path });
    expect(denied.isError).toBe(true);
    expect(denied.content[0]?.text).toContain('overwrite: true');
    expect(await readFile(output_path, 'utf-8')).toBe('preserved');
    expect(get).not.toHaveBeenCalled();
    expect(payload(await handler({ ...request, output_path, overwrite: true })).warnings).toEqual(metadata.warnings);
    expect(await readFile(output_path, 'utf-8')).toBe(markdown);
  });

  it('refuses a file created while the render is in flight', async () => {
    const output_path = join(root, 'raced.toml');
    get.mockImplementationOnce(async () => {
      await writeFile(output_path, 'concurrent writer');
      return { markdown, ...metadata };
    });
    const result = await handler({ ...request, output_path });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('overwrite: true');
    expect(await readFile(output_path, 'utf-8')).toBe('concurrent writer');
  });

  it('checks physical containment when an ancestor changes during rendering', async () => {
    const directory = join(root, 'changed-parent');
    get.mockImplementationOnce(async () => {
      await symlink(outside, directory);
      return { markdown, ...metadata };
    });
    const result = await handler({ ...request, output_path: join(directory, 'escape.toml') });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('outside the allowed root');
    await expect(readFile(join(outside, 'escape.toml'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('works with a configured root alias while refusing symlinks below it', async () => {
    const alias = join(outside, 'root-alias');
    await symlink(root, alias);
    process.env['OUTPUT_BASE_DIR'] = alias;
    const output_path = join(alias, 'nested', 'render.toml');
    payload(await handler({ ...request, output_path }));
    expect(await readFile(join(root, 'nested', 'render.toml'), 'utf-8')).toBe(markdown);
  });

  it('documents host, root, cwd and symlink constraints in the advertised schema', () => {
    const description = RenderDefinitionInputSchema.shape.output_path.description;
    for (const text of ['server host', 'OUTPUT_BASE_DIR', 'cwd', 'Symlink', 'Remote callers']) {
      expect(description).toContain(text);
    }
  });
});
