/**
 * Safely blurs the currently active DOM element on Web.
 */
export function blurActiveElement(): void {
	if (typeof document !== "undefined" && document.activeElement) {
		const activeHtmlElement = document.activeElement as HTMLElement | null;
		activeHtmlElement?.blur();
	}
}
