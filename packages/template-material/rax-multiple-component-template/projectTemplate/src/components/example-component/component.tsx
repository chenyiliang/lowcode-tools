import { createElement, forwardRef, ForwardRefRenderFunction } from 'rax';
import View from 'rax-view';
import Text from 'rax-text';
import './style.scss';

export interface ComponentProps {
  /**
   * 名称
   */
  name?: string;
  /**
   * 子节点
   */
  children?: any;
}

/**
 * 示例组件
 * @param props
 * @constructor
 */
function ExampleComponent(props: ComponentProps, ref: any) {
  // React 19 移除了函数组件的 defaultProps，改用默认参数值（行为等价）
  const { name = '标题', children } = props;
  return (
    <View ref={ref} className="container">
      <Text className="name">{name || ''}</Text>
      <Text className="content">{children}</Text>
    </View>
  );
}

const RefComponent = forwardRef(ExampleComponent as ForwardRefRenderFunction<any, ComponentProps>);

RefComponent.displayName = 'ExampleComponent';

export default RefComponent;
