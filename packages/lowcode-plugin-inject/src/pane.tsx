import { Checkbox, Table, Button } from '@alifd/next';
import { IPublicModelPluginContext } from '@alilc/lowcode-types';
import React from 'react';
import { InjectConfig, type IInjectConfig } from './controller';

import './pane.scss';

interface InjectedSetterItem {
  name: string;
}

interface EditorViewOption {
  label: string;
  value: string;
}

interface ResourceOption {
  label: string;
  value: string;
  children?: EditorViewOption[];
}

interface InjectInfo {
  injectedSetters?: InjectedSetterItem[];
}

export interface PaneProps {
  injectConfig: InjectConfig;
  pluginContext: IPublicModelPluginContext;
  updateInjectConfig: (pluginName: string, resourceName: string, viewName: string, check: boolean) => void;
  getInjectInfo: () => Promise<InjectInfo>;
  injectedPluginConfigMap: Record<string, any> | null;
}

interface InjectDataSourceRow {
  pluginName: string;
}

const GLOBAL_OPTION: ResourceOption = {
  label: '全局',
  value: 'global',
};

export function Pane(props: PaneProps) {
  const { injectConfig, pluginContext, updateInjectConfig, getInjectInfo, injectedPluginConfigMap } = props;
  const [injectInfo, setInjectInfo] = React.useState<InjectInfo>({});
  const [dataSource, setDataSource] = React.useState<InjectDataSourceRow[]>([]);

  const { workspace } = pluginContext;
  const resourceTypeList = (workspace as any).resourceTypeList ?? [];
  const options: ResourceOption[] = [
    GLOBAL_OPTION,
    ...resourceTypeList.map((resource: any): ResourceOption => ({
      label: resource.description || resource.resourceName,
      value: resource.resourceName,
      children: resource.editorViews?.map((view: any): EditorViewOption => ({
        label: `${view.viewName}视图`,
        value: view.viewName,
      })),
    })),
  ];

  const updateConfig = React.useCallback((config: IInjectConfig) => {
    const newDataSource: InjectDataSourceRow[] = Object.keys(config)
      .map((pluginName) => ({ pluginName }))
      .filter((row) => Boolean(injectedPluginConfigMap?.[row.pluginName]));
    setDataSource(newDataSource);

    getInjectInfo().then((res) => {
      setInjectInfo(res);
    });
  }, [getInjectInfo, injectedPluginConfigMap]);

  React.useEffect(() => {
    updateConfig(injectConfig.config);
    const unsubscribe = injectConfig.onChange((config) => {
      updateConfig(config);
    });
    return unsubscribe;
  }, [injectConfig, updateConfig]);

  const { injectedSetters } = injectInfo;

  if (!dataSource?.length && !injectedSetters?.length) {
    return (
      <div className="inject-setting-panel-empty">
        <div className="inject-setting-panel-empty-title">
          未检测到调试插件/组件
        </div>
      </div>
    );
  }

  const handleReset = () => {
    injectConfig.clearAll();
    injectConfig.save();
    window.location.reload();
  };

  return (
    <div className="inject-setting-panel">
      <span className="inject-setting-panel-title">
        设计器插件：
      </span>
      <span style={{ float: 'right' }}>
        <Button size="small" onClick={handleReset}>重置插件配置</Button>
      </span>
      <Table className="inject-setting-panel-table" dataSource={dataSource}>
        <Table.Column title="插件名字" htmlTitle="插件" dataIndex="pluginName" />
        <Table.Column
          title="调试注册视图"
          dataIndex="pluginName"
          cell={(pluginName: string, _index: number, record: InjectDataSourceRow) => (
            <>
              {options.map((resource) => {
                if (resource.children) {
                  return (
                    <div key={resource.value}>
                      <span className="inject-setting-panel-label">{resource.label}</span>
                      {resource.children.map((view) => (
                        <Checkbox
                          key={view.value}
                          checked={injectConfig.get(pluginName, resource.value, view.value)}
                          onChange={(checked: boolean) => {
                            updateInjectConfig(record.pluginName, resource.value, view.value, checked);
                          }}
                        >
                          {view.label}
                        </Checkbox>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={resource.value}>
                    <span className="inject-setting-panel-label">{resource.label}</span>
                    <Checkbox
                      checked={injectConfig.get(pluginName, resource.value)}
                      onChange={(checked: boolean) => {
                        updateInjectConfig(record.pluginName, resource.value, '', checked);
                      }}
                    />
                  </div>
                );
              })}
            </>
          )}
        />
      </Table>
      <InjectItem title="Setter" injectItems={injectedSetters} />
    </div>
  );
}

interface InjectItemProps {
  title: string;
  injectItems?: InjectedSetterItem[];
}

function InjectItem(props: InjectItemProps) {
  if (!props.injectItems || !props.injectItems.length) {
    return null;
  }

  return (
    <div>
      <span className="inject-setting-panel-title">{props.title}：</span>
      <div className="inject-setting-panel-inject-item">
        {props.injectItems.map((item) => (
          <span key={item.name}>{item.name}</span>
        ))}
      </div>
    </div>
  );
}

export default Pane;
