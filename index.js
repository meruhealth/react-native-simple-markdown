/* @flow */

import React, { PureComponent } from 'react'
import { View } from 'react-native'
import SimpleMarkdown from 'simple-markdown'
import _ from 'lodash'
import initialRules from './rules'
import initialStyles from './styles'

type Props = {
  styles: StyleSheet,
  children?: string,
  rules: Object,
  whitelist: Array,
  blacklist: Array,
}

type DefaultProps = Props & {
  children: string,
}

const TEXT_TYPES = {
  text: true,
  strong: true,
  em: true,
  u: true,
}

const HEADING_TYPES = {
  text: true,
}

const transformTextItems = (node) => {
  const content = _.transform(node.content, (res, item) => {
    const lastI = res.length - 1
    // Combine consecutive same string types together
    if (lastI >= 0 && TEXT_TYPES[item.type] && res[lastI].type === item.type) {
      res[lastI].content += item.content
    } else {
      if (item.type === 'text' || !TEXT_TYPES[item.type]) {
        res.push(item)
      } else {
        const transformedItem = transformTextItems(item)
        res.push(transformedItem)
      }
    }
  }, [])

  return {
    ...node,
    content,
  }
}

class Markdown extends PureComponent<DefaultProps, Props, void> {
  static defaultProps = {
    styles: initialStyles,
    children: '',
    rules: {},
    whitelist: [],
    blacklist: [],
  }

  static transformTreeForRN (tree) {

    return tree.map(node => {
      if (node.type === 'paragraph') {
        return transformTextItems(node)
      } else if (node.type === 'heading') {
        return transformTextItems(node)
      } else {
        return node
      }
    })
  }

  /** Post processes rules to strip out unwanted styling options
    * while keeping the default 'paragraph' and 'text' rules
    */
  _postProcessRules = (preRules: Array<string>): Array<string> => {
      const defaultRules = ['paragraph', 'text']
      if (this.props.whitelist.length) {
        return _.pick(preRules, _.concat(this.props.whitelist, defaultRules))
      }
      else if (this.props.blacklist.length) {
        return _.omit(preRules, _.pullAll(this.props.blacklist, defaultRules))
      }
      else {
        return preRules
      }
  }

  _renderContent = (children: string): React$Element<any> => {
    try {
      const mergedStyles = Object.assign(initialStyles, this.props.styles)
      const rules = this._postProcessRules(_.merge({}, SimpleMarkdown.defaultRules, initialRules(mergedStyles), this.props.rules))
      const child = Array.isArray(this.props.children)
        ? this.props.children.join('')
        : this.props.children
      const blockSource = child + '\n\n'
      let tree = SimpleMarkdown.parserFor(rules)(blockSource, { inline: false })
      tree = Markdown.transformTreeForRN(tree)
      return SimpleMarkdown.reactFor(SimpleMarkdown.ruleOutput(rules, 'react'))(tree)
    } catch(errors) {
      this.props.errorHandler
        ? this.props.errorHandler(errors,children)
        : console.error(errors)
    }
  }

  shouldComponentUpdate = (nextProps: Props): boolean => (
    this.props.children !== nextProps.children || this.props.styles !== nextProps.styles
  )

  render() {
    return (
      <View style={[initialStyles.view, this.props.styles.view]}>
        {this._renderContent(this.props.children)}
      </View>
    )
  }

}

export default Markdown
