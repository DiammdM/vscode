/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { addDisposableListener, h } from '../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IObservable, constObservable, autorun } from '../../../../../../base/common/observable.js';
import { ObservableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { OffsetRange } from '../../../../../common/core/offsetRange.js';
import { InlineCompletionsModel } from '../../model/inlineCompletionsModel.js';
import { Point } from './utils.js';

export interface IInlineEditsIndicatorState {
	editTopLeft: Point;
	showAlways: boolean;
	action: 'tabToJump' | 'tabToAccept' | undefined;
}

export class InlineEditsIndicator extends Disposable {
	private readonly _indicator = h('div.inline-edits-view-indicator', {
		style: {
			position: 'absolute',
			overflow: 'visible',
			cursor: 'pointer',
		},
	}, [
		h('div.icon', {}, [
			renderIcon(Codicon.arrowLeft),
		]),
		h('div.label@label', {}, [
			' inline edit'
		])
	]);

	constructor(
		private readonly _editorObs: ObservableCodeEditor,
		private readonly _state: IObservable<IInlineEditsIndicatorState | undefined>,
		private readonly _model: IObservable<InlineCompletionsModel | undefined>,
	) {
		super();

		this._register(addDisposableListener(this._indicator.root, 'click', () => {
			const s = this._state.get();
			if (!s) { return; }
			const m = this._model.get();
			if (s.action === 'tabToJump') {
				m?.jump();
			} else if (s.action === 'tabToAccept') {
				m?.accept(m?.editor);
			}
		}));

		this._register(autorun(reader => {
			const s = this._state.read(reader);
			function getText() {
				if (!s) { return ''; }
				if (s.action === 'tabToJump') {
					return 'Tab to jump';
				} else if (s.action === 'tabToAccept') {
					return 'Tab to accept';
				} else {
					return 'Inline Edit';
				}
			}
			this._indicator.label.textContent = getText();
		}));

		this._register(this._editorObs.createOverlayWidget({
			domNode: this._indicator.root,
			position: constObservable(null),
			allowEditorOverflow: false,
			minContentWidthInPx: constObservable(0),
		}));

		this._register(autorun(reader => {
			const state = this._state.read(reader);
			if (!state) {
				this._indicator.root.style.visibility = 'hidden';
				return;
			}

			this._indicator.root.style.visibility = '';
			const i = this._editorObs.layoutInfo.read(reader);

			const range = new OffsetRange(0, i.height - 30);

			const topEdit = state.editTopLeft;
			this._indicator.root.classList.toggle('top', topEdit.y < range.start);
			this._indicator.root.classList.toggle('bottom', topEdit.y > range.endExclusive);
			const showAnyway = state.showAlways;
			this._indicator.root.classList.toggle('visible', showAnyway);
			this._indicator.root.classList.toggle('contained', range.contains(topEdit.y));


			this._indicator.root.style.top = `${range.clip(topEdit.y)}px`;
			this._indicator.root.style.right = `${i.minimap.minimapWidth + i.verticalScrollbarWidth}px`;
		}));
	}
}
