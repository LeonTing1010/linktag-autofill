import { Plugin } from 'obsidian';

export class StatusBarManager {
  private plugin: Plugin;
  private statusBarItem: HTMLElement | null = null;

  constructor(plugin: Plugin) {
      this.plugin = plugin;
      this.init();
  }

  private init() {
      // Create status bar item
      this.statusBarItem = this.plugin.addStatusBarItem();
      this.updateStatus('ready');
  }

  updateStatus(status: 'ready' | 'processing' | 'error', message?: string) {
      if (!this.statusBarItem) return;

      switch (status) {
          case 'ready':
              this.statusBarItem.setText('LinkTag: Ready');
              this.statusBarItem.style.color = '';
              break;
          case 'processing':
              this.statusBarItem.setText('LinkTag: Processing...');
              this.statusBarItem.style.color = 'var(--text-accent)';
              break;
          case 'error':
              this.statusBarItem.setText(`LinkTag: Error${message ? ` - ${message}` : ''}`);
              this.statusBarItem.style.color = 'var(--text-error)';
              break;
      }
  }

  destroy() {
      // Status bar items are automatically cleaned up when plugin unloads
      this.statusBarItem = null;
  }
}