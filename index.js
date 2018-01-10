import React, { PureComponent } from 'react';
import axios from 'axios';
import { Icon, Modal } from 'antd';


import "./index.css";

const ReadImage = (file, cb) => {
  const reader = new FileReader(),
    image = new Image();

  reader.readAsDataURL(file);
  reader.onload = function (_file) {
    image.src = _file.target.result; // url.createObjectURL(file);
    image.onload = function () {
      const META = {
        width: this.width,
        height: this.height,
        type: file.type,
        name: file.name,
        size: file.size,
        src: this.src
      };
      if (typeof cb == 'function') {
        cb(null, META);
      }
      // return META;
    };
    image.onerror = function () {
      console.warn('Invalid file type: ' + file.type);
      return cb(new Error('Invalid file type: ' + file.type));
    };
  };
};

class Uploader extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      config: {
        // 宽高限制
        maxWidth: 0,
        minWidth: 0,
        maxHeight: 0,
        minHeight: 0,
        // 数量限制
        maxNum: 0,
        // 文件大小限制
        fileSize: 4e+6,
        // 支持左右移动
        isMove: false,
        // 设置主图
        isSetMain: false,
        // 支持预览
        isPreview: true,
        // 支持删除
        isRemove: true,
        // 照片墙
        fileList: [],
        // 底部说明文字
        desc: '',
        // 支持批量上传
        multiple: false,
        // 上传地址
        Action: `http://seller.ymatou.com/products/api/uploadImg`,
        // 背景样式
        backgroundStyle: {},
        // 照片墙样式
        wallStyle: {},
        // wrap样式
        wrapStyle: {},
        // 顶部说明文字
        topDesc: '',
        // 单个上传按钮样式
        btnStyle: 'multiple',
      },
      // 预览modal
      isShowPreview: false,
      previewSrc: '',
      AttachmentList: [],
    };
  }

  /*
   *  // 上传前钩子函数
   beforeUpload: () => {
   },
   // remove
   onRemove: () => {
   },
   // change
   onChange: () => {
   }
   * */

  componentWillMount() {
    this.setState({
      config: {
        ...this.state.config,
        ...this.props
      }
    });
  }

  // 设置照片墙
  componentWillReceiveProps(nextProps) {
    this.setState({
      config: {
        ...this.state.config,
        ...nextProps
      }
    });
  }

  // 删除图片
  _handleRemove = (idx) => {
    this.setState({
      config: {
        ...this.state.config,
        fileList: [
          ...this.state.config.fileList.slice(0, idx),
          ...this.state.config.fileList.slice(
            idx + 1, this.state.config.fileList.length
          ),
        ]
      }
    }, function () {
      this.props.onRemove && this.props.onRemove(this.state.config.fileList);
    })
  };

  // 移动图片
  _handleMove = (index, direction) => {
    let tmpArr = this.state.config.fileList;
    switch (direction) {
      case 0:
        if (index === 0) {
          return;
        }
        tmpArr[index] = tmpArr.splice(index - 1, 1, tmpArr[index])[0];
        break;
      case 1:
        if (index === tmpArr.length - 1) {
          return;
        }
        tmpArr[index] = tmpArr.splice(index + 1, 1, tmpArr[index])[0];
        break;
      case -1:
        if (index === 0) {
          return;
        }
        tmpArr[index] = tmpArr.splice(0, 1, tmpArr[index])[0];
        break;
      default:
        break;
    }
    this.setState({
      config: {
        ...this.state.config,
        fileList: tmpArr
      }
    }, function () {
      this.props.onMove && this.props.onMove(this.state.config.fileList);
    });
  };

  // 预览
  _handlePreview = (src) => {
    this.setState({
      isShowPreview: true,
      previewSrc: src
    })
  };


  // 图片上传
  _handleSubmit(e) {
    e.preventDefault();
    // TODO: do something with -> this.state.file
    console.log('handle uploading-', this.state.files);
  }


  // 上传校验
  handleValidate = (fileList) => {
    const { config } = this.state;
    let sizeError = [], whError = [], typeError = [];
    const that = this;

    // remove file
    const removeFile = (file) => {
      fileList = fileList.filter(item => {
        return item.name !== file.name;
      })
    };

    // file meta
    const fileMeta = (fileList, cb) => {
      let tmpNum = 0;
      fileList.forEach((file) => {
        ReadImage(file, (err, meta) => {
          file.meta = meta;
          tmpNum++;
          if (tmpNum === fileList.length) {
            return cb(fileList);
          }
        });
      });
    };

    // 校验图片类型
    fileList.forEach(file => {
      if (file.type.split('/')[0] !== 'image') {
        typeError.push(`${file.name}不是图片类型`);
        removeFile(file);
      }
    });

    if (typeError.length > 0) {
      Modal.error({
        title: '图片格式错误',
        content: typeError.map((item, index) => (<div key={`imgTypeErr_${index}`}>{item}</div>))
      });
    }


    // 校验大小
    if (config.fileSize > 0) {
      fileList.forEach((file) => {
        if (file.size > config.fileSize) {
          if (config.fileSize >= 1024 * 1024) {
            sizeError.push(`图片${file.name}超出大小限制!最大不超过${config.fileSize / 1024 / 1024}M`);
          } else {
            sizeError.push(`图片${file.name}超出大小限制!最大不超过${config.fileSize / 1024}K`);
          }
          removeFile(file);
        }
      });
    }

    if (sizeError.length > 0) {
      Modal.error({
        title: '图片大小超出限制',
        content: sizeError.map((item, index) => (<div key={`imgSizeErr_${index}`}>{item}</div>))
      });
    }

    // 检验宽高
    if (config.minWidth > 0 || config.minHeight > 0 || config.maxWidth > 0 || config.maxHeight > 0) {
      fileMeta(fileList, fileList => {
        fileList.forEach((file) => {
          if (file.meta.width < config.minWidth && config.minWidth > 0) {
            file.errorFlag = 1;
            whError.push(`图片${file.name}低于图片文件最小宽度限制${config.minWidth}像素，请选择其他图片`);
          } else if (file.meta.width > config.maxWidth && config.maxWidth > 0) {
            file.errorFlag = 1;
            whError.push(`图片${file.name}高于最大图片文件宽度限制${config.maxWidth}像素，请选择其他图片`);
          } else if (file.meta.height < config.minHeight && config.minHeight > 0) {
            file.errorFlag = 1;
            whError.push(`图片${file.name}低于图片文件最低高度限制${config.minHeight}像素，请选择其他图片`);
          } else if (file.meta.height > config.maxHeight && config.maxHeight > 0) {
            file.errorFlag = 1;
            whError.push(`图片${file.name}高于图片最大高度限制${config.maxHeight}像素，请选择其他图片`);
          }
        });

        // 宽高不符合要求
        if (whError.length > 0) {
          Modal.error({
            title: '图片宽高不合要求',
            content: whError.map((item, index) => (<div key={`imgTypeWH_${index}`}>{item}</div>))
          })
        }
        fileList = fileList.filter(file => {
          return !file.errorFlag || file.errorFlag !== 1;
        });
        // 发送图片数据
        fileList.forEach((file,index) => {
          if(config.maxNum){
            if(index < config.maxNum){
              that.handleUpload(file);
            }
          }else{
            that.handleUpload(file);
          }
        });
        // that.props.onChange && that.props.onChange(fileList);
      });
    } else {
      // 发送图片数据
      fileList.forEach((file,index) => {
        if(config.maxNum){
          if(index < config.maxNum){
            that.handleUpload(file);
          }
        }else{
          that.handleUpload(file);
        }
      });
      // this.props.onChange && this.props.onChange(fileList);
    }
  };

  // 上传change
  _handleImageChange = (ev) => {
    ev.preventDefault();
    let fileList = [...ev.target.files];
    if (!fileList) {
      return;
    }
    // 上传前钩子
    let beforeFlag = true;
    if (this.props.beforeUpload) {
      beforeFlag = this.props.beforeUpload(fileList);
    }
    beforeFlag && this.handleValidate(fileList);

  };

  handleUpload = (file) => {
    const that = this;
    const { config } = this.state;
    const contentType = { headers: { 'Content-Type': 'application/octet-stream' } };
    const data = new FormData();
    data.append('file', file);
    axios.post(config.Action, data, contentType).then(result => {
      if (result.data.Success && result.data.Data.Status === 200) {
        const attachs = that.state.config.fileList;
        if (!(config.maxNum && config.maxNum <= attachs.length)) {
          attachs.push({
            uid: attachs.length,
            name: file.name,
            status: 'done',
            src: result.data.Data.Result.PicUrl
          });
          that.setState({
            config: {
              ...that.state.config,
              fileList: attachs
            }
          });
          that.props.onChange && that.props.onChange(attachs);
        }
      } else {
        Modal.error({
          title: '上传失败',
          // content: `${result.data.Msg}`,
          content: '系统超时，请重新上传',
        });
      }
    });
  };

  onDrop = (e) => {
    // const { config } = this.state;
    e.preventDefault()
    e.dataTransfer.clearData("text")
    // e.currentTarget.style.borderColor = 'rgb(222, 222, 222)'
    const fileList = [...e.dataTransfer.files];
    if (!fileList || !fileList.length) {
      return false;
    }
    // 上传前钩子
    let beforeFlag = true;
    if (this.props.beforeUpload) {
      beforeFlag = this.props.beforeUpload(fileList);
    }
    beforeFlag && this.handleValidate(fileList);
    return false
  };

  onDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.style.borderColor = 'red';
  };

  onDragLeave = (e) => {
    const { config } = this.state;
    e.preventDefault();
    // e.currentTarget.style.borderColor = 'rgb(222, 222, 222)'
  };

  render() {
    const { config } = this.state;
    const uploadBtn = (
      <div className="uploader-btn">
        {config.multiple && <div className="uploader-desc">您可以从电脑中选择图片拖拽到此区域进行上传</div>}
        {
          config.multiple ?
            <label className="btn-uploader ant-btn">
              <Icon type="plus" className="uploader-icon" />点击上传
              <input
                multiple
                className="fileInput" type="file"
                onChange={(e) => this._handleImageChange(e)}
                accept=".bmp,.jpg,.png,.jpeg"
                onClick={(ev) => {
                  ev.target.value = ''
                }}
              />
            </label> :
            <label className="btn-uploader ant-btn">
              <Icon type="plus" className="uploader-icon" />点击上传
              <input
                className="fileInput" type="file"
                onChange={(e) => this._handleImageChange(e)}
                accept=".bmp,.jpg,.png,.jpeg"
                onClick={(ev) => {
                  ev.target.value = ''
                }}
              />
            </label>
        }
      </div>
    );
    const uploadSingleBtn = (
      <li className="img-item fl single-btn">
        <label className="btn-uploader ant-btn-single">
          <Icon type="plus" style={{ color: '#aaa', marginTop: '20px', fontSize: '26px' }} />
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>Upload</div>
          <input
            className="fileInput" type="file"
            onChange={(e) => this._handleImageChange(e)}
            accept=".bmp,.jpg,.png,.jpeg"
            onClick={(ev) => {
              ev.target.value = ''
            }}
          />
        </label>
      </li>
    );

    return (
      <div className="uploader-component">
        <Modal
          visible={this.state.isShowPreview}
          footer={null}
          onCancel={() => this.setState({ isShowPreview: false })}
        >
          <img style={{ width: '100%' }} src={this.state.previewSrc} alt="" />
        </Modal>
        <div className="uploader-wrap" style={{ ...config.wrapStyle }} onDragOver={this.onDragOver} onDrop={this.onDrop} onDragLeave={this.onDragLeave}>
          <div className="uploader-top">
            {config.topDesc}
            {
              config.maxNum > 0 && config.btnStyle === 'multiple' ?
                <span className="f-fr">{config.fileList.length}/{config.maxNum}</span> : null
            }
            <div className="clear"></div>
          </div>
          <div className="uploader-background"
               style={config.fileList.length > 0 || config.btnStyle === 'single' ? { ...config.backgroundStyle, display: 'none' } : {
                 ...config.backgroundStyle,
                 display: 'block'
               }}>
          </div>
          <div className="uploader-wall"
               style={(config.fileList.length > 0 || config.btnStyle === 'single') ? { ...config.wallStyle, display: 'block' } : { ...config.wallStyle, display: 'none' }}>
            <ul>
              {
                config.fileList && config.fileList.map((imgItem, index) => (
                  <li className="img-item fl" key={`li_${Date.parse(new Date()) + index}_${imgItem.uid}`}>
                    <img width={90} height={90} key={`img_${Date.parse(new Date()) + index}_${imgItem.uid}`} src={imgItem.src} alt={imgItem.name} />
                    {
                      config.maxNum > 1 ? <span className="uploader-num">{index + 1}</span> : null
                    }
                    <div className="uploaderAction">
                      <div className="middle-action">
                        {
                          config.isPreview &&
                          <a style={{ display: 'inline-block', marginRight: '4px' }} href="javascript:;" onClick={() => this._handlePreview(imgItem.src)}><Icon type="eye" /></a>
                        }
                        {
                          config.isRemove &&
                          <a href="javascript:;" onClick={() => this._handleRemove(index)}><Icon type="delete" /></a>
                        }
                      </div>
                      <div className="bottom-action">
                        {
                          config.isMove &&
                          <a className="f-fl" href="javascript:;" onClick={() => this._handleMove(index, 0)}><Icon type="caret-left" /></a>
                        }
                        {
                          config.isSetMain &&
                          <a href="javascript:;" onClick={() => this._handleMove(index, -1)}>设为主图</a>

                        }
                        {
                          config.isMove &&
                          <a className="f-fr" href="javascript:;" onClick={() => this._handleMove(index, 1)}><Icon type="caret-right" /></a>
                        }
                        <div className="clear"></div>
                      </div>
                    </div>
                  </li>
                ))
              }
              {
                (config.maxNum > 0 && (config.fileList.length >= config.maxNum)) || config.btnStyle === 'multiple' ? null : uploadSingleBtn
              }
              <li className="clear"></li>
            </ul>
          </div>
          { (config.maxNum > 0 && (config.fileList.length >= config.maxNum)) || config.btnStyle === 'single' ? null : uploadBtn }
        </div>
        <div className="uploader-desc">{config.desc}</div>
      </div>
    );
  }
}

export default Uploader;