    <template>
	<div class="symbol-uploader" v-show="showUploader">
		<el-upload
			class="upload-demo"
			:action="uploadUrl"
			:on-progress="handleUploadProgress"
			:on-remove="handleRemove"
			:on-success="handleUploadSuccess"
			:on-error="handleUploadError"
			:http-request="uploadFile"
			:before-upload="beforeUpload"
			:multiple="false"
			:file-list="fileList"
			ref="upload"
		>
			<el-button size="mini" type="primary" class="upload-indicator-btn"
				>Click to upload custom symbol file</el-button
			>
			<div slot="tip" class="el-upload__tip">
				You can only upload 1 csv file which doesn't exceed 1MB. File names are
				only allowed to contain English letters, numbers, spaces, and
				underscores.
				<el-button type="text" @click="exampleDataVisible = true"
					>View Example Data</el-button
				>
			</div>
		</el-upload>
		<el-dialog
			:modal="false"
			:title="previewFileName"
			:visible.sync="dialogFormVisible"
			:close-on-click-modal="false"
			:close-on-press-escape="false"
			:show-close="false"
		>
			<el-form
				:model="form"
				class="custom-indicator-form"
				:rules="userIndicatorRules"
				ref="userForm"
			>
				<el-form-item
					label="Symbol Name"
					:label-width="formLabelWidth"
					prop="indicatorName"
				>
					<el-input v-model="form.indicatorName" autocomplete="off" @keydown.native.prevent.enter="onEnter"></el-input>
				</el-form-item>
			</el-form>
			<div slot="footer" class="dialog-footer">
				<el-button @click="handleDialogClose"
					>Use the file name directly</el-button
				>
				<el-button type="primary" @click="handleDialogConfirm('userForm')"
					>Confirm</el-button
				>
			</div>
		</el-dialog>
		<el-dialog
			:modal="false"
			:title="nonBusinessTitle"
			:visible.sync="nonBusinessDialogVisible"
			:show-close="false"
		>
			<el-card
				class="box-card"
				style="margin-top: 20px; max-height: 400px; overflow-y: auto"
			>
				<div v-for="item in nonBusinessDay" :key="item" class="text item">
					{{ item }}
				</div>
			</el-card>
			<span slot="footer" class="dialog-footer">
				<el-button @click="cancelBusinessDialogClose">Cancel</el-button>
				<el-button type="primary" @click="confirmBusinessDialogClose"
					>Ignore</el-button
				>
			</span>
		</el-dialog>
		<el-dialog
			:modal="false"
			:title="exampleDataTitle"
			:visible.sync="exampleDataVisible"
		>
			<el-table
				:data="exampleData"
				style="margin-top: 20px; max-height: 400px; overflow-y: auto"
			>
				<el-table-column label="Date" prop="Date"></el-table-column>
				<el-table-column label="Open" prop="Open"></el-table-column>
				<el-table-column label="High" prop="High"></el-table-column>
				<el-table-column label="Low" prop="Low"></el-table-column>
				<el-table-column label="Close" prop="Close"></el-table-column>
				<el-table-column label="Volume" prop="Volume"></el-table-column>
			</el-table>
		</el-dialog>
	</div>
</template>
    
    <script>
// import SparkMD5 from 'spark-md5'
import { CIQ } from '@/components/common/chart/st-development/js'
import {
	symbolCsvFileDelete,
	getPairData,
} from '@/service/service'
import Papa from 'papaparse'
import axios from 'axios'
import {
	compareArrays,

} from '@/utils'
import moment from 'moment'
import { getSymbolInfo } from '@/utils/globalFunc'

export default {
	name: 'Uploader',
	data() {
		var validateIndicatorName = (rule, value, callback) => {
			const reg = /^[a-zA-Z][a-zA-Z0-9_]*$/
			let _value = value.replace(/\s*/g, '')
			if (!_value) {
				callback(new Error('Name cannot be empty.'))
			} else if (!reg.test(_value)) {
				//callback(new Error('It must start with a letter and can only contain letters, numbers, spaces, and underscores.'))
				callback()
			} else {
				callback()
			}
		}
		return {
            showUploader: false,
			fileList: [],
			actionUrl: '', // 文件上传的接口地址
			headers: {
				'Content-Type': 'multipart/form-data'
			}, // 请求头部
			previewFileName: '',
			cancelToken: null, // 用于保存取消上传请求的取消令牌
			uploadUrl: '/dev/user_upload/uploadsymbolcsv/',
			uploadHeaders: {},
			dialogFormVisible: false,
			form: {
				indicatorName: ''
			},
			formLabelWidth: '120px',
			userIndicatorRules: {
				indicatorName: [{ validator: validateIndicatorName, trigger: 'blur' }],
				dialogValid: false
			},
			rawMap: {}, // 文件对象的 raw 属性备份
			// file_hash: '',
			nonBusinessTitle: 'Non-trading day schedule in CSV',
			nonBusinessDay: [],
			nonBusinessDialogVisible: false,
			nonBusinessFile: '',
			exampleDataTitle: 'Example Data',
            exampleData: [
                { Date: '2018-01-02', Open: '54.24', High: '55.32', Low: '53.67', Close: '54.24', Volume: '870452' },
                { Date: '2018-01-03', Open: '46.15', High: '47.07', Low: '45.23', Close: '46.15', Volume: '678905' },
                { Date: '2018-01-04', Open: '53.87', High: '54.95', Low: '52.80', Close: '53.87', Volume: '456789' },
                { Date: '2018-01-05', Open: '62.65', High: '63.90', Low: '61.40', Close: '62.65', Volume: '789012' },
                { Date: '2018-01-08', Open: '51.61', High: '52.64', Low: '50.57', Close: '51.61', Volume: '567890' },
                { Date: '2018-01-09', Open: '49.73', High: '50.72', Low: '48.74', Close: '49.73', Volume: '345678' },
                { Date: '2018-01-10', Open: '52.37', High: '53.42', Low: '51.32', Close: '52.37', Volume: '890123' },
                { Date: '2018-01-11', Open: '58.09', High: '59.25', Low: '56.93', Close: '58.09', Volume: '234567' },
                { Date: '2018-01-12', Open: '62.60', High: '63.85', Low: '61.35', Close: '62.60', Volume: '987654' },
                { Date: '2018-01-16', Open: '50.63', High: '51.64', Low: '49.62', Close: '50.63', Volume: '123456' }
            ],
			exampleDataVisible: false,
			createdIndicatorOptions: [],
			userIndicator: '',
            observer: null,
		}
	},
    mounted() {
        this.filterMutationObserver()
    },
    beforeDestroy() {
        this.observer.disconnect();
    },
	methods: {
		/** disable enter while naming a custom symbol */
		onEnter(event) {
			event.preventDefault();
  		},
        filterMutationObserver(){
            let self = this
            // 获取你想要观察的元素
            const targetParentNode = document.querySelector('.ciq-search');
            const targetNodes = targetParentNode.querySelectorAll('cq-filter');

            // 配置观察选项
            const config = {
                attributes: true,
                attributeFilter: ['class']
            };

            // 创建一个回调函数来处理变动
            const callback = function(mutationsList, observer) {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (mutation.target.textContent.trim() === 'CUSTOM SYMBOL') {
                            if (mutation.target.classList.contains('true')) {
                                self.showUploader = true
                            } else {
                                self.showUploader = false
                            }
                        }
                    }
                }
            };
// TODO 考虑DOM优化 
            // 创建一个MutationObserver实例并传入回调函数
            const observer = new MutationObserver(callback);

            // 开始观察所有目标节点
            targetNodes.forEach(targetNode => {
                observer.observe(targetNode, config);
            });
        },
		uploadFile(file) {
			console.log('文件上传', file)
			const self = this
			let suffix = ''
			// 创建 FormData 对象，将文件添加到 FormData 中

			const formData = new FormData()
			try {
				suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1]
			} catch (error) {
				return
			}
			const name = file.name.replace(`.${suffix}`, '')
			const fileName = name.replace(/\s*/g, '')
			formData.append('name', fileName)
			formData.append('type', 'symbol')
			// formData.append('hash', file.hash)
			formData.append('suffix', suffix)
			formData.append('file', file)

			// 创建 CancelToken 实例
			const cancelToken = axios.CancelToken.source()
			// 保存取消令牌，以便在需要终止上传时使用
			self.cancelToken = cancelToken
			// 发送上传请求
			axios
				.post(self.uploadUrl, formData, {
					headers: {
						...self.uploadHeaders,
						...{
							cancelToken: cancelToken.token
						}
					},
					onUploadProgress: (event) => {}
				})
				.then(async (response) => {
					CIQ.hideCover()
					CIQ.nprogress.done()

					// 文件上传完成后的处理逻辑
					console.log('文件Response', response)
					const { code, data, error } = response.data
					// 还原文件对象的 raw 属性
					if (code == 200 || code == 201) {
						let _this = document.querySelector('cq-lookup')
						await this.$store.dispatch('chart/get_mysymbolist')
						//_this.acceptText(_this.input.val(),'CUSTOM SYMBOL')
						// 文件上傳成功後把對應file in list加上url屬性用於delete時作爲參數傳入
						file.url = JSON.parse(data).url
						self.$notify.success({
							title: 'Tips',
							message:
								'File uploaded successfully. You can click on the file to preview it.',
							duration: 0
						})
					} else if(code == 406){
						return Promise.reject('Symbol name already exists')
					} else if(code == 500){
						return Promise.reject('Some fields contain invalid data types. Please check and re-upload.')
					}
					else {
						return Promise.reject('File upload failed.')
					}
					// ...
				})
				.catch((error) => {
					CIQ.hideCover()
					CIQ.nprogress.done()
					// 文件上传出错的处理逻辑
					console.log('文件上传失败', error)
					// 清空文件列表
					self.$refs.upload.clearFiles()
					self.fileList = []
					self.$notify.warning({
						title: 'Tips',
						message: error,
						duration: 0
					})

					// ...
				})
		},
		handleUploadSuccess(response, file, fileList) {
			this.fileList = this.fileList.slice(-1)
			console.log('上传成功回调：', response)
		},
		handleUploadError(error, file, fileList) {
			// 上传失败回调
			console.log('上传失败：', error)
			this.dialogFormVisible = false
			this.$refs.upload.clearFiles()
			this.fileList = []
			// 更新文件列表中对应文件的状态为
		},
		async handleRemove(file, fileList) {
			console.log('处理删除', file)
			// 备份文件对象的 raw 属性
			this.rawMap[file.uid] = this.rawMap[file.uid] || file.raw
			
			if(!file.url) {	
				// 如果是校驗失敗則直接移除文件並清空fileList
				this.$refs.upload.clearFiles()
			 	this.fileList = []
			 	return
			}
			try {
				await symbolCsvFileDelete(file.url)
				console.log('删除成功',file.url)

				let _this = document.querySelector('cq-lookup')
				await _this.updateMySymbol(_this.input.val(), 'CUSTOM SYMBOL')
				_this.acceptText(_this.input.val(),'CUSTOM SYMBOL')
			} catch (error) {
				console.log('删除失败', error)
			} finally {
				this.$refs.upload.clearFiles()
				this.fileList = []
			}
		},
		handleExceed(files, fileList) {
			this.$notify.warning({
				title: 'Tips',
				message: 'Only single symbol files can be uploaded.',
				duration: 0
			})
			return false
		},
		async beforeUpload(file) {
			CIQ.addCover('File verification in progress...')
			CIQ.nprogress.start()
			if (!file.raw) {
				const reader = new FileReader()
				reader.onload = (event) => {
					file.raw = event.target.result
				}
				reader.readAsDataURL(file)
			}
			console.log('上传前', file)
			// 备份文件对象的 raw 属性
			this.rawMap[file.uid] = this.rawMap[file.uid] || file.raw
			if (!/(CSV)/i.test(file.type)) {
				CIQ.hideCover()
				CIQ.nprogress.done()
				this.$notify.warning({
					title: 'Tips',
					message: 'The uploaded file must be in CSV format.',
					duration: 0
				})
				return Promise.reject('The uploaded file must be in CSV format.')
			}
			const reg = /^[a-zA-Z][a-zA-Z0-9_]*$/
			let fileName = file.name.replace(/\s*/g, '')
			if (!reg.test(fileName.replace('.csv', ''))) {
				CIQ.hideCover()
				CIQ.nprogress.done()
				this.$notify.warning({
					title: 'Tips',
					message:
						'The file name must start with a letter and can only contain letters, numbers, spaces, and underscores.',
					duration: 0
				})
				return Promise.reject(
					'The file name must start with a letter and can only contain letters, numbers, spaces,and underscores.'
				)
			}
			if (file.size === 0) {
				CIQ.hideCover()
				CIQ.nprogress.done()
				this.$notify.warning({
					title: 'Tips',
					message: 'Empty files cannot be uploaded.',
					duration: 0
				})
				return Promise.reject('Empty files cannot be uploaded.')
			}
			// 限制文件上传大小 1M
			if (file.size > 1 * 1024 * 1024) {
				CIQ.hideCover()
				CIQ.nprogress.done()
				this.$notify.warning({
					title: 'Tips',
					message: 'The uploaded file cannot exceed 1MB.',
					duration: 0
				})
				return Promise.reject('The uploaded file cannot exceed 1MB.')
			}
			try {
				try {
					/** START
					 * 	remove empty line
					 */
					const fileContent = await this.readFileContent(file);
					// 统一化Linux和Window换行符的差异
					const normalizedContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
					const filteredContent = await this.fillEmptyColsAndSkipEmptyLine(normalizedContent)
					const newFile = new File([filteredContent], file.name, { type: file.type });
					/********END********* */
					
					await this.validateCSV(newFile)
					await this.handleParseResult(this.csvContent, newFile)

					this.form.indicatorName = newFile.name.replace('.csv', '')
					this.fileList.push(newFile)
					
					CIQ.hideCover()
					CIQ.nprogress.done()
					this.dialogFormVisible = true
				} catch (error) {
					console.log(error)
					throw Error()
				}
			} catch (error) {
				console.log('error', error)
				this.dialogFormVisible = false
				CIQ.hideCover()
				CIQ.nprogress.done()
				return Promise.reject(error)
			}
			return false
		},
		readFileContent(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (event) => {
					resolve(event.target.result);
				};
				reader.onerror = (error) => {
					reject(error);
				};
				reader.readAsText(file);
			});
    	},
		fillEmptyColsAndSkipEmptyLine(content){
			return new Promise((resolve, reject) => {
				let csvContent = []
				Papa.parse(content, {
							header: true, // 指定是否将第一行作为字段名
							skipEmptyLines: true,
							trimHeaders: true, // 去除表头中每个字段的空格
							trimRows: true, // 去除数据行中每个字段的空格
							step: function (row) {
								const requiredFields = ['Date','Open','High','Low','Close','Volume',];

								// 填充缺失字段
								for (const field of requiredFields) {
									// 如果列名不存在則填充
									if (!row.data[field] && row.data[field] != 0){
										if(field == 'Volume') row.data[field] = 1
										else row.data[field] = row.data['Close'] 
									}  
								}

								csvContent.push(row.data)
							},
							complete: function () {
								// 将处理后的 csvContent 转换回 CSV 字符串
								const csvString = Papa.unparse(csvContent, {
									columns: ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
								});
                				resolve(csvString);
							},
							error: (error) => {
								reject(error)
							}
				})
			});
		},
		handleUploadProgress(event, uid, fileList) {
			// 上传进度回调
			let { loaded, total } = event
			const progress = (loaded / total) * 100
			this.fileList = fileList.map((item) => {
				console.log(item.uid)
				if (item.uid === uid) {
					item.progress = progress
				}
			})
			// const progress = Math.round(event.percent);
			// 自定义方式展示进度条
			// this.$refs.upload.$el.querySelector('.el-progress-bar__inner').style.width = progress + '%';
		},
		handleDialogClose() {
			CIQ.addCover('File upload in progress...')
			CIQ.nprogress.start()
			console.log('弹窗关闭')
			this.$refs['userForm'].resetFields()
			this.dialogFormVisible = false
			const file = this.fileList[this.fileList.length - 1]
			this.uploadFile(file)
		},
		handleDialogConfirm(formName) {
			CIQ.addCover('Uploading file...')
			CIQ.nprogress.start()
			this.$refs[formName].validate((valid) => {
				if (valid) {
					console.log('this.fileList', this.fileList)
					this.fileList.map((item) => {
						const oldFileName = item.name
						const _indicatorName = this.form.indicatorName.replace(/\s*/g, '')
						const newFileName = oldFileName.replace(
							oldFileName.replace('.csv', ''),
							_indicatorName
						)
						const file = this.fileList[this.fileList.length - 1]
						console.log('弹窗确认')
						const blob = file.slice(0, file.size, file.type)
						const newFile = new File([blob], newFileName, { type: file.type })
						newFile.uid = file.uid
						// newFile.hash = this.file_hash
						this.fileList.splice(-1, 1, newFile)
						this.dialogValid = true
						this.dialogFormVisible = false
						this.uploadFile(newFile)
					})
					// this.$refs.upload.submit()
					return
				} else {
					CIQ.hideCover()
					CIQ.nprogress.done()
				}
			})
		},
		cancelIndicatorName(formName) {
			this.$refs[formName].resetFields()
			this.dialogFormVisible = false
		},
		async validateCSV(file) {
			const self = this
			return await new Promise(async (resolve, reject) => {
				// 限制字段
				let isDateFormat = true
				let isNumFormat = true
				let isNotEmpty = true
				self.csvContent = []

				try {
					const content = await self.readFileContent(file);
					// const hash = SparkMD5.hashBinary(reader.result)
					// file.hash = hash
					// self.file_hash = hash
					const rows = content.trim().split('\n')
					const headers = rows[0].trim().split(',')
					const lines = content.split('\n')
					// 获取 CSV 文件的字段顺序
					const fieldOrder = lines[0].trim().split(',')
					const isOrdered = this.validateCSVFieldOrder(fieldOrder)
					if (!isOrdered) {
						CIQ.hideCover()
						CIQ.nprogress.done()
						return reject(new Error('CSV field order is incorrect.'))
					}

					// 判断表头和表内容是否都存在
					if (
						headers.length === 0 ||
						(headers.length !== 0 && rows.length === 1)
					) {
						isNotEmpty = false
					}
					// 使用 PapaParse 解析 CSV 文件内容
					const errorRow = []
					const result = Papa.parse(content, {
						header: true, // 指定是否将第一行作为字段名
						skipEmptyLines: true,	// 已经在前面的fillEmptyCols移除了空行
						trimHeaders: true, // 去除表头中每个字段的空格
						trimRows: true, // 去除数据行中每个字段的空格
						step: function (row) {
							const error = {}
							const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/
							const numFormatRegex = /^-?\d+(\.\d{1,})?$/
							const requiredFields = {
								'Date': dateFormatRegex,
								'Open': numFormatRegex,
								'High': numFormatRegex,
								'Low': numFormatRegex,
								'Close': numFormatRegex,
								'Volume': numFormatRegex
							};
							for (const key in row.data) {
								if (Object.hasOwnProperty.call(row.data, key)) {
									row.data[key] = row.data[key].trim()
								}
							}
							/** 在前面的fillEmptyCols也填充了空列,可能不会进判断 */
							for (const field in requiredFields) {
								// 如果列名不存在則填充
								if (!row.data[field] && row.data[field] != 0){
									if(field == 'Volume') row.data[field] = 1
									else row.data[field] = row.data['Close'] 
								}  
							}
							for (const field in requiredFields) {
								if (!requiredFields[field].test(row.data[field])) {
									console.log(`${field} 格式校验失败`, row.data[field]);
									error['Date'] = row.data['Date'];
									error['Open'] = row.data['Open'];
									error['High'] = row.data['High'];
									error['Low'] = row.data['Low'];
									error['Close'] = row.data['Close'];
									error['Volume'] = row.data['Volume'];
									if(field == 'Date') isDateFormat = false
									else isNumFormat = false
									errorRow.push(error)
									// parser.pause()
									return
								}
							}
							errorRow.push(error)
							self.csvContent.push(row)
							// parser.resume()
						},
						complete: function () {
							// resolve(csvContent)
						},
						error: (error) => {
							reject(error)
						}
					})
					// 进行字段校验
					const isVerified = this.validateFields(errorRow)
					if (
						isVerified &&
						isOrdered &&
						isDateFormat &&
						isNumFormat &&
						isNotEmpty
					) {
						// this.progress = 0 // 每次上传前重置进度为0
						// this.fileList.push({
						// 	uid: file.uid,
						// 	name: file.name,
						// 	progress: 0, // 进度初始化为 0
						// 	status: 'uploading' // 状态设置为上传中
						// })
						// this.form.indicatorName = file.name.replace('.csv', '')
						// this.fileList.push(file)
						// this.dialogFormVisible = true
						resolve(file)
					} // 校验通过，允许上传
					if (!isNotEmpty) {
						CIQ.hideCover()
						CIQ.nprogress.done()
						this.$notify.warning({
							title: 'Tips',
							message:
								'Uploaded CSV file is empty. Ensure table header and content are present.',
							duration: 0
						})
						return reject(
							new Error(
								'Uploaded CSV file is empty. Ensure table header and content are present.'
							)
						)
					}
					if (!isVerified) {
						CIQ.hideCover()
						CIQ.nprogress.done()
						return reject(new Error('CSV field validation failed.'))
					}
					if (!isDateFormat) {
						CIQ.hideCover()
						CIQ.nprogress.done()
						this.$notify.warning({
							title: 'Tips',
							message:
								'Date column in the file has an incorrect format. It should be in yyyy-MM-dd format, like 2023-04-20.',
							duration: 0
						})
						return reject(
							new Error(
								`Date column in the file has an incorrect format. It should be in yyyy-MM-dd format, like 2023-04-20.`
							)
						)
					}
					if (!isNumFormat) {
						CIQ.hideCover()
						CIQ.nprogress.done()
						this.$notify.warning({
							title: 'Tips',
							message:
								'Close column in the file has an incorrect format. It must be a numerical value, such as 45.55.',
							duration: 0
						})
						return reject(
							new Error(
								`Close column in the file has an incorrect format. It must be a numerical value, such as 45.55.`
							)
						)
					}
				} catch (error) {
					CIQ.hideCover();
					CIQ.nprogress.done();
					reject(error);
				}
			})
		},
		validateFields(_data) {
			const data = _data.filter((item) => Object.keys(item).length)
			if (data.length > 0) {
				// 如果有错误，显示错误信息 生成表格行的 HTML
				const tableRows = data
					.map(
						(item) => `
            <tr>
                <td>${item.Date}</td>
                <td>${item.Open}</td>
                <td>${item.High}</td>
                <td>${item.Low}</td>
                <td>${item.Close}</td>
                <td>${item.Volume}</td>
            </tr>
            `
					)
					.join('')

				// 生成完整的 HTML 片段，包括表头和动态生成的行
				const tableHTML = `
            <div>
                <p>Data format is wrong in these rows. Correct before re-uploading.</p>
                <table border="1" style="width: 100%; text-align: center">
                <tr>
                    <th>Date</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                </tr>
                ${tableRows}
                </table>
            </div>
            `

				// 使用 $message 显示 HTML
				this.$notify.warning({
					title: 'Incorrect Data Format in Rows',
					dangerouslyUseHTMLString: true,
					message: tableHTML,
					duration: 0
				})
				return false
			}
			return true
		},
		validateCSVFieldOrder(fieldOrder) {
			// 在这里进行 CSV 字段顺序校验的逻辑
			const orderedValues = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']; // 规定顺序
			for (let i = 0; i < fieldOrder.length - 1; i++) {
				const currentIndex = orderedValues.indexOf(fieldOrder[i])
				const nextIndex = orderedValues.indexOf(fieldOrder[i + 1])
				// 首先名称存在，再判断顺序
				if (
					currentIndex !== -1 &&
					nextIndex !== -1 &&
					currentIndex > nextIndex
				) {
					this.$notify.warning({
						title: 'Tips',
						message: 'Field order validation failed.',
						duration: 0
					})
					return false
				}
				if (currentIndex == -1 || nextIndex == -1) {
					this.$notify.warning({
						title: 'Tips',
						message:
							'File header is missing or incorrect. It should be: [Date, Open, High, Low, Close, Volume].',
						duration: 0
					})
					return false
				}
			}
			return true
		},
		async handleParseResult(data, file) {
			console.log('处理过的结果', data)
			// 按照时间排序
			const sortedRows = data.sort(
				(a, b) => moment(a.data.Date) - moment(b.data.Date)
			)
			// 获取 Date 列的数据
			const dateData = sortedRows.map((row) => row.data.Date)
			// 计算时间间隔
			const startDate = dateData[0]
			const endDate = dateData[dateData.length - 1]
			const frequency =
				this.$store.state.form.backtestInfo.frequency.toLowerCase()
			if (frequency !== 'daily') {
				this.$notify.warning({
					title: 'Tips',
					message:
						'Only daily CSV files can be uploaded. Please set the timeframe to Daily and try uploading again.',
					duration: 0
				})
				return Promise.reject(
					`Only daily CSV files can be uploaded. Please set the timeframe to Daily and try uploading again.`
				)
			}
			let symbol =
				this.$store.state.form.backtestSymbol ||
				process.env.VUE_APP_DEFAULT_SYMBOL
			/** 防止当前为custom symbol时发送对比pairdata和my data出错 */
			const {type} = getSymbolInfo(symbol)
			if(!['stock','index'].includes(type)){
				symbol = process.env.VUE_APP_DEFAULT_SYMBOL
			}
			const res = await getPairData(startDate, endDate, frequency, symbol)
			const pairDataDate = res.data.map((item) => {
				const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
				if (dateRegex.test(item.DT)) {
					const dateObj = new Date(item.DT)
					const formattedDate = dateObj.toISOString().slice(0, 10)
					return formattedDate
				} else {
					console.log('Invalid date format')
					CIQ.hideCover()
					CIQ.nprogress.done()
					this.$notify.warning({
						title: 'Tips',
						message: 'Invalid date format.',
						duration: 0
					})
					return Promise.reject(`Invalid date format.`)
				}
			})
			// const pairStartDate = pairDataDate[0]
			// const pairEndDate = pairDataDate[pairDataDate.length - 1]
			// const filteredArr = dateData.filter(date => date >= pairStartDate && date <= pairEndDate);
			//  const filteredArr = dateData
			const isDiffDateArr = compareArrays(dateData, pairDataDate)
			if (isDiffDateArr === true) {
				// 用户上传的 Date 和 pairData 的 Date 一致
				return Promise.resolve(true)
			} else {
				const diffDateArr = Array.from(new Set(isDiffDateArr))
				CIQ.hideCover()
				CIQ.nprogress.done()
				this.$notify.warning({
					title: 'Tips',
					message:
						'Only daily CSV files can be uploaded. Please ensure that the CSV file does not contain non-trading days such as weekends and public holidays.',
					duration: 0
				})
				console.log('上传的 CSV 中, 以下时间是非交易日', diffDateArr)
				this.nonBusinessDay = diffDateArr
				this.nonBusinessFile = file
				this.nonBusinessDialogVisible = true
				return Promise.reject(
					`Only daily CSV files can be uploaded. Please ensure that the CSV file does not contain non-trading days such as weekends and public holidays.`
				)
			}
		},
		cancelBusinessDialogClose() {
			this.nonBusinessDialogVisible = false
		},
		confirmBusinessDialogClose() {
			this.nonBusinessDialogVisible = false
			const file = this.nonBusinessFile
			const csvData = file.raw
			const csvContent = csvData.split(';base64,').pop()
			const decodedData = atob(csvContent)
			const parsedData = this.parseCSV(decodedData)
			console.log('解析的数据', parsedData)
			const filteredData = parsedData.filter(
				(row) => !this.nonBusinessDay.includes(row.Date)
			)
			console.log('filteredData', filteredData)

			function convertToCSV(dataArray) {
				const headers = Object.keys(dataArray[0])
				const rows = dataArray.map((row) =>
					headers.map((header) => row[header])
				)
				const csvContent = [
					headers.join(','),
					...rows.map((row) => row.join(','))
				].join('\n')
				// return `data:text/csv;base64,${btoa(csvContent)}`;
				return csvContent
			}

			const filteredCsvData = convertToCSV(filteredData)
			const base64Data = btoa(filteredCsvData) // 编码为 Base64
			const rawValue = `data:text/csv;base64,${base64Data}`
			const filteredFile = new File([filteredCsvData], `${file.name}`, {
				type: 'text/csv'
			})
			filteredFile.raw = rawValue
			filteredFile.uid = file.uid
			// filteredFile.hash = file.hash
			console.log('file', file)
			console.log('filteredFile', filteredFile)
			this.form.indicatorName = filteredFile.name.replace('.csv', '')
			this.fileList.push(filteredFile)
			console.log(this.fileList)
			CIQ.hideCover()
			CIQ.nprogress.done()
			this.dialogFormVisible = true
		},
		parseCSV(csvData) {
			const rows = csvData.split('\n')
			const headers = rows[0].split(',')
			const data = []

			for (let i = 1; i < rows.length; i++) {
				const row = rows[i].split(',')
				if (row.length === headers.length) {
					const rowData = {}
					for (let j = 0; j < headers.length; j++) {
						rowData[headers[j]] = row[j]
					}
					data.push(rowData)
				}
			}

			return data
		},
	}
}
</script>
    <style lang="less" scoped>
.upload-demo {
	display: flex;
	flex-direction: row-reverse;
	// position: absolute;
	// top: 28px;
	min-height: 85px;
}
.upload-demo {
	flex-direction: column;
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
	border-left: 1px solid #dcdfe6;
	border-right: 1px solid #dcdfe6;
	border-bottom: 1px solid #dcdfe6;
	padding: 5px;
}
.upload-indicator-btn {
	width: 100%;
}
.el-upload__tip {
	line-height: 15px;
}
.ciq-night .el-upload__tip {
	color: #fff;
}
</style>
    